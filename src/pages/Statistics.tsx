import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Download,
  Clock,
  Euro,
  UserCheck,
  CalendarCheck,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { setupSafeSnapshot } from '../utils/firestoreListener';
import { toDateSafe } from '../utils/dataCleaning';
import { Button } from '../components/ui/Button';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subWeeks, subMonths, isWithinInterval,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AuditLogger, AuditEventType, SensitivityLevel } from '../utils/auditLogger';

interface PatientStats {
  total: number;
  active: number;
  newThisMonth: number;
  seenLast30Days: number;
  byGender: { male: number; female: number; other: number };
  byAgeGroup: { [key: string]: number };
}

interface AppointmentStats {
  today: number;
  thisWeek: number;
  occupancyRate: number;
  cancellationRate: number;
  totalSlots: number;
  bookedSlots: number;
}

interface InvoiceStats {
  currentMonthRevenue: number;
  unpaidAmount: number;
  collectionRate: number;
  previousMonthRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
}

const Statistics: React.FC = () => {
  const [patientStats, setPatientStats] = useState<PatientStats>({
    total: 0,
    active: 0,
    newThisMonth: 0,
    seenLast30Days: 0,
    byGender: { male: 0, female: 0, other: 0 },
    byAgeGroup: {}
  });

  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats>({
    today: 0,
    thisWeek: 0,
    occupancyRate: 0,
    cancellationRate: 0,
    totalSlots: 0,
    bookedSlots: 0
  });

  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats>({
    currentMonthRevenue: 0,
    unpaidAmount: 0,
    collectionRate: 0,
    previousMonthRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isCalculating, setIsCalculating] = useState(false);

  const logChange = async (
    resource: string,
    field: string,
    previousValue: number,
    currentValue: number
  ) => {
    if (previousValue !== currentValue) {
      await AuditLogger.log(
        AuditEventType.DATA_ACCESS,
        resource,
        'sync_check',
        SensitivityLevel.INTERNAL,
        'success',
        {
          field,
          previous: previousValue,
          current: currentValue,
          period: selectedPeriod
        }
      );
    }
  };

  // Mise à jour de l'heure actuelle toutes les secondes
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(clockInterval);
  }, []);

  // Rafraîchissement automatique toutes les 3 secondes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadAllStats();
    }, 3000);
    
    return () => clearInterval(refreshInterval);
  }, [selectedPeriod]);

  // Initial load
  useEffect(() => {
    loadAllStats();
  }, [selectedPeriod]);

  useEffect(() => {
    if (!auth.currentUser) return;
    let unsubscribe: () => void = () => {};
    (async () => {
      const invoicesRef = collection(db, 'invoices');
      const q = query(invoicesRef, where('osteopathId', '==', auth.currentUser!.uid));
      unsubscribe = await setupSafeSnapshot(q, () => {
        setIsCalculating(true);
        loadInvoiceStats().finally(() => setIsCalculating(false));
      }, (err) => {
        console.error('Invoice listener error:', err);
      });
    })();
    return () => unsubscribe();
  }, [selectedMonth, selectedPeriod]);

  useEffect(() => {
    if (!auth.currentUser) return;
    let unsubscribe: () => void = () => {};
    (async () => {
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, where('osteopathId', '==', auth.currentUser!.uid));
      unsubscribe = await setupSafeSnapshot(q, () => {
        setIsCalculating(true);
        loadPatientStats().finally(() => setIsCalculating(false));
      }, (err) => {
        console.error('Patient listener error:', err);
      });
    })();
    return () => unsubscribe();
  }, [selectedMonth, selectedPeriod]);

  useEffect(() => {
    if (!auth.currentUser) return;
    let unsubscribe: () => void = () => {};
    (async () => {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where('osteopathId', '==', auth.currentUser!.uid));
      unsubscribe = await setupSafeSnapshot(q, () => {
        setIsCalculating(true);
        loadAppointmentStats().finally(() => setIsCalculating(false));
      }, (err) => {
        console.error('Appointment listener error:', err);
      });
    })();
    return () => unsubscribe();
  }, [selectedPeriod]);

  useEffect(() => {
    if (!auth.currentUser) return;
    let unsubscribe: () => void = () => {};
    (async () => {
      const consultationsRef = collection(db, 'consultations');
      const q = query(consultationsRef, where('osteopathId', '==', auth.currentUser!.uid));
      unsubscribe = await setupSafeSnapshot(q, () => {
        setIsCalculating(true);
        Promise.all([loadPatientStats(), loadAppointmentStats()]).finally(() => setIsCalculating(false));
      }, (err) => {
        console.error('Consultation listener error:', err);
      });
    })();
    return () => unsubscribe();
  }, [selectedPeriod]);

  const loadAllStats = async () => {
    if (!auth.currentUser) return;

    try {
      setError(null);
      await Promise.all([
        loadPatientStats(),
        loadAppointmentStats(),
        loadInvoiceStats()
      ]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading statistics:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientStats = async () => {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('osteopathId', '==', auth.currentUser!.uid));
    const snapshot = await getDocs(q);

    const patients = snapshot.docs.map(doc => doc.data());
    const now = new Date();
    const baseDate = selectedPeriod === 'month' ? selectedMonth : now;
    const monthStart = startOfMonth(baseDate);
    const { currentStart, currentEnd } = getPeriodRange(selectedPeriod, baseDate);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate age groups
    const ageGroups: { [key: string]: number } = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };

    const genderCount = { male: 0, female: 0, other: 0 };
    let newThisMonth = 0;

    patients.forEach(patient => {
      const g = patient.gender;
      if (g === 'male') genderCount.male++;
      else if (g === 'female') genderCount.female++;
      else genderCount.other++;

      // Age groups
      if (patient.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      }

      const created = patient.createdAt?.toDate?.() || (patient.createdAt ? new Date(patient.createdAt) : null);
      if (created && created >= monthStart) {
        newThisMonth++;
      }
    });

    // Get consultations for "seen last 30 days"
    const consultationsRef = collection(db, 'consultations');
    const consultationsQuery = query(
      consultationsRef,
      where('osteopathId', '==', auth.currentUser!.uid)
    );
    const consultationsSnapshot = await getDocs(consultationsQuery);

    const uniquePatientsLast30Days = new Set<string>();
    const uniquePatientsInPeriod = new Set<string>();
    consultationsSnapshot.docs.forEach(doc => {
      const consultation = doc.data();
      const consultationDate = toDateSafe(consultation.date);
      if (consultationDate >= thirtyDaysAgo) {
        uniquePatientsLast30Days.add(consultation.patientId);
      }
      if (isWithinInterval(consultationDate, { start: currentStart, end: currentEnd })) {
        uniquePatientsInPeriod.add(consultation.patientId);
      }
    });

    const nextStats: PatientStats = {
      total: patients.length,
      active: uniquePatientsInPeriod.size,
      newThisMonth,
      seenLast30Days: uniquePatientsLast30Days.size,
      byGender: genderCount,
      byAgeGroup: ageGroups
    };
    await logChange('statistics/patients', 'total', patientStats.total, nextStats.total);
    await logChange('statistics/patients', 'active', patientStats.active, nextStats.active);
    await logChange('statistics/patients', 'newThisMonth', patientStats.newThisMonth, nextStats.newThisMonth);
    await logChange('statistics/patients', 'seenLast30Days', patientStats.seenLast30Days, nextStats.seenLast30Days);
    setPatientStats(nextStats);
  };

  const loadAppointmentStats = async () => {
    const consultationsRef = collection(db, 'consultations');
    const q = query(consultationsRef, where('osteopathId', '==', auth.currentUser!.uid));
    const snapshot = await getDocs(q);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const baseDate = selectedPeriod === 'month' ? selectedMonth : now;
    const { currentStart, currentEnd } = getPeriodRange(selectedPeriod, baseDate);

    let todayCount = 0;
    let periodCount = 0;
    let cancelledCountInPeriod = 0;
    let totalInPeriod = 0;

    snapshot.docs.forEach(doc => {
      const consultation = doc.data();
      const consultationDate = toDateSafe(consultation.date);

      if (consultationDate.toDateString() === today.toDateString()) {
        todayCount++;
      }

      if (isWithinInterval(consultationDate, { start: currentStart, end: currentEnd })) {
        periodCount++;
        totalInPeriod++;
        if (consultation.status === 'cancelled') {
          cancelledCountInPeriod++;
        }
      }
    });

    const slotsPerDay = 11;
    const workingDays = getWorkingDaysInRange(currentStart, currentEnd);
    const totalSlots = workingDays * slotsPerDay;
    const occupancyRate = totalSlots > 0 ? (periodCount / totalSlots) * 100 : 0;
    const cancellationRate = totalInPeriod > 0 ? (cancelledCountInPeriod / totalInPeriod) * 100 : 0;

    const nextAppStats: AppointmentStats = {
      today: todayCount,
      thisWeek: periodCount,
      occupancyRate: Math.min(occupancyRate, 100),
      cancellationRate,
      totalSlots,
      bookedSlots: periodCount
    };
    await logChange('statistics/appointments', 'today', appointmentStats.today, nextAppStats.today);
    await logChange('statistics/appointments', 'countPeriod', appointmentStats.thisWeek, nextAppStats.thisWeek);
    await logChange('statistics/appointments', 'occupancyRate', appointmentStats.occupancyRate, nextAppStats.occupancyRate);
    await logChange('statistics/appointments', 'cancellationRate', appointmentStats.cancellationRate, nextAppStats.cancellationRate);
    await logChange('statistics/appointments', 'totalSlots', appointmentStats.totalSlots, nextAppStats.totalSlots);
    await logChange('statistics/appointments', 'bookedSlots', appointmentStats.bookedSlots, nextAppStats.bookedSlots);
    setAppointmentStats(nextAppStats);
  };

  const getWorkingDaysInRange = (start: Date, end: Date) => {
    const days = [] as Date[];
    let d = new Date(start.getTime());
    while (d <= end) {
      days.push(new Date(d.getTime()));
      d.setDate(d.getDate() + 1);
    }
    return days.filter(day => {
      const dow = day.getDay();
      return dow !== 0 && dow !== 6;
    }).length;
  };

  const loadInvoiceStats = async () => {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, where('osteopathId', '==', auth.currentUser!.uid));
    const snapshot = await getDocs(q);

    const invoices = snapshot.docs.map(doc => doc.data());
    const now = new Date();
    const baseDate = selectedPeriod === 'month' ? selectedMonth : now;
    const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodRange(selectedPeriod, baseDate);

    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    let unpaidAmount = 0;
    let paidInvoices = 0;

    const toNumberSafe = (value: any): number => {
      if (typeof value === 'number') {
        return isFinite(value) ? value : 0;
      }
      if (typeof value === 'string') {
        const cleaned = value.replace(/\s|\u00A0/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    invoices.forEach(invoice => {
      const issueDate = new Date(invoice.issueDate);
      const total = toNumberSafe(invoice.total);
      
      if (isWithinInterval(issueDate, { start: currentStart, end: currentEnd })) {
        if (invoice.status === 'paid') {
          currentMonthRevenue += total;
        }
      }

      if (isWithinInterval(issueDate, { start: previousStart, end: previousEnd })) {
        if (invoice.status === 'paid') {
          previousMonthRevenue += total;
        }
      }

      // Unpaid invoices
      if (invoice.status !== 'paid') {
        unpaidAmount += total;
      } else {
        paidInvoices++;
      }
    });

    const collectionRate = invoices.length > 0 ? (paidInvoices / invoices.length) * 100 : 0;

    const nextInvoiceStats: InvoiceStats = {
      currentMonthRevenue,
      previousMonthRevenue,
      unpaidAmount,
      collectionRate,
      totalInvoices: invoices.length,
      paidInvoices
    };
    await logChange('statistics/invoices', 'currentMonthRevenue', invoiceStats.currentMonthRevenue, nextInvoiceStats.currentMonthRevenue);
    await logChange('statistics/invoices', 'previousMonthRevenue', invoiceStats.previousMonthRevenue, nextInvoiceStats.previousMonthRevenue);
    await logChange('statistics/invoices', 'unpaidAmount', invoiceStats.unpaidAmount, nextInvoiceStats.unpaidAmount);
    await logChange('statistics/invoices', 'collectionRate', invoiceStats.collectionRate, nextInvoiceStats.collectionRate);
    await logChange('statistics/invoices', 'totalInvoices', invoiceStats.totalInvoices, nextInvoiceStats.totalInvoices);
    await logChange('statistics/invoices', 'paidInvoices', invoiceStats.paidInvoices, nextInvoiceStats.paidInvoices);
    setInvoiceStats(nextInvoiceStats);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getPeriodRange = (period: string, baseDate: Date) => {
    if (period === 'week') {
      const cs = startOfWeek(baseDate, { weekStartsOn: 1 });
      const ce = endOfWeek(baseDate, { weekStartsOn: 1 });
      const ps = startOfWeek(subWeeks(baseDate, 1), { weekStartsOn: 1 });
      const pe = endOfWeek(subWeeks(baseDate, 1), { weekStartsOn: 1 });
      return { currentStart: cs, currentEnd: ce, previousStart: ps, previousEnd: pe };
    }
    if (period === 'quarter') {
      const cs = startOfQuarter(baseDate);
      const ce = endOfQuarter(baseDate);
      const prev = subQuarters(baseDate, 1);
      const ps = startOfQuarter(prev);
      const pe = endOfQuarter(prev);
      return { currentStart: cs, currentEnd: ce, previousStart: ps, previousEnd: pe };
    }
    if (period === 'year') {
      const cs = startOfYear(baseDate);
      const ce = endOfYear(baseDate);
      const prev = subYears(baseDate, 1);
      const ps = startOfYear(prev);
      const pe = endOfYear(prev);
      return { currentStart: cs, currentEnd: ce, previousStart: ps, previousEnd: pe };
    }
    const cs = startOfMonth(baseDate);
    const ce = endOfMonth(baseDate);
    const prev = subMonths(baseDate, 1);
    const ps = startOfMonth(prev);
    const pe = endOfMonth(prev);
    return { currentStart: cs, currentEnd: ce, previousStart: ps, previousEnd: pe };
  };

  const getRevenueChange = () => {
    if (invoiceStats.previousMonthRevenue === 0) return 0;
    return ((invoiceStats.currentMonthRevenue - invoiceStats.previousMonthRevenue) / invoiceStats.previousMonthRevenue) * 100;
  };

  const exportStats = () => {
    const data = {
      patients: patientStats,
      appointments: appointmentStats,
      invoices: invoiceStats,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Formatage de la date et de l'heure
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getAppointmentsPeriodLabel = () => {
    if (selectedPeriod === 'week') return "RDV cette semaine";
    if (selectedPeriod === 'month') return "RDV ce mois";
    if (selectedPeriod === 'quarter') return "RDV ce trimestre";
    if (selectedPeriod === 'year') return "RDV cette année";
    return "RDV";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <div className="text-sm text-gray-500">
            {formatDate(currentDateTime)} - {formatTime(currentDateTime)}
          </div>
          <div className="text-xs text-gray-400">
            Dernière mise à jour: {formatTime(lastUpdate)}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input text-sm"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={exportStats}
            leftIcon={<Download size={16} />}
          >
            Exporter
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/5 border border-error/20 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="text-error mr-3" size={24} />
            <div>
              <h3 className="font-medium text-error">Erreur</h3>
              <p className="text-error/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Patient Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="mr-2" size={24} />
            Statistiques Patients
          </h2>
          {isCalculating && (
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-3 h-3 border-b-2 rounded-full animate-spin border-primary-600 mr-2"></div>
              Calcul en cours…
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Patients actifs</p>
                <p className="text-2xl font-bold text-gray-900">{patientStats.active}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCheck className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nouveaux ce mois</p>
                <p className="text-2xl font-bold text-gray-900">{patientStats.newThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vus (30 derniers jours)</p>
                <p className="text-2xl font-bold text-gray-900">{patientStats.seenLast30Days}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total patients</p>
                <p className="text-2xl font-bold text-gray-900">{patientStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Users className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Gender and Age Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition par sexe</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hommes</span>
                <span className="font-medium">{patientStats.byGender.male}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Femmes</span>
                <span className="font-medium">{patientStats.byGender.female}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Autre</span>
                <span className="font-medium">{patientStats.byGender.other}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition par âge</h3>
            <div className="space-y-3">
              {Object.entries(patientStats.byAgeGroup).map(([ageGroup, count]) => (
                <div key={ageGroup} className="flex items-center justify-between">
                  <span className="text-gray-600">{ageGroup} ans</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="mr-2" size={24} />
            Statistiques Agenda
          </h2>
          {isCalculating && (
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-3 h-3 border-b-2 rounded-full animate-spin border-primary-600 mr-2"></div>
              Calcul en cours…
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">RDV aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.today}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="text-orange-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{getAppointmentsPeriodLabel()}</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.thisWeek}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CalendarCheck className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux d'occupation</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.occupancyRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux d'annulation</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.cancellationRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="mr-2" size={24} />
            Statistiques Factures
            {selectedPeriod === 'month' && (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} leftIcon={<ChevronLeft size={14} />} />
                <span className="text-sm text-gray-600">
                  {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} leftIcon={<ChevronRight size={14} />} disabled={addMonths(selectedMonth, 1) > new Date()} />
              </div>
            )}
          </h2>
          {isCalculating && (
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-3 h-3 border-b-2 rounded-full animate-spin border-primary-600 mr-2"></div>
              Calcul en cours…
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CA ce mois</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(invoiceStats.currentMonthRevenue)}
                </p>
                <div className="flex items-center mt-1">
                  {getRevenueChange() >= 0 ? (
                    <TrendingUp className="text-green-500 mr-1" size={16} />
                  ) : (
                    <TrendingDown className="text-red-500 mr-1" size={16} />
                  )}
                  <span className={`text-sm ${getRevenueChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(getRevenueChange()).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Euro className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Factures impayées</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(invoiceStats.unpaidAmount)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de recouvrement</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceStats.collectionRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <PieChart className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CA mois précédent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(invoiceStats.previousMonthRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="text-gray-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Comparison */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Comparaison mensuelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Mois actuel</p>
              <p className="text-xl font-bold text-primary-600">
                {formatCurrency(invoiceStats.currentMonthRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Mois précédent</p>
              <p className="text-xl font-bold text-gray-600">
                {formatCurrency(invoiceStats.previousMonthRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Évolution</p>
              <div className="flex items-center justify-center">
                {getRevenueChange() >= 0 ? (
                  <TrendingUp className="text-green-500 mr-2" size={20} />
                ) : (
                  <TrendingDown className="text-red-500 mr-2" size={20} />
                )}
                <p className={`text-xl font-bold ${getRevenueChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {getRevenueChange() >= 0 ? '+' : ''}{getRevenueChange().toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;