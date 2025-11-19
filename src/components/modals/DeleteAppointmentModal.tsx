import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface DeleteAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  appointmentInfo: {
    patientName: string;
    date: string;
    time: string;
  };
}

const DeleteAppointmentModal: React.FC<DeleteAppointmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  appointmentInfo
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white rounded-xl shadow-xl w-[90%] max-w-md"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle size={18} />
                <span className="font-medium">Supprimer le rendez‑vous</span>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                Confirmez la suppression du rendez‑vous pour <span className="font-medium">{appointmentInfo.patientName}</span>.
              </p>
              <div className="text-sm text-gray-600">
                <div>Date: <span className="font-medium">{appointmentInfo.date}</span></div>
                <div>Heure: <span className="font-medium">{appointmentInfo.time}</span></div>
              </div>
              <p className="text-xs text-gray-500">
                Cette action mettra à jour automatiquement la prochaine consultation dans le dossier patient.
              </p>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
              <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>Supprimer</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteAppointmentModal;