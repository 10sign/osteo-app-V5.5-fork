import React from 'react';

function Resources() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Resources</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-3">Patient Education Materials</h2>
          <p className="text-gray-600 mb-4">Access educational resources to share with your patients.</p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            Browse Materials →
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-3">Clinical Guidelines</h2>
          <p className="text-gray-600 mb-4">Latest treatment protocols and best practices.</p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            View Guidelines →
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-3">Forms & Templates</h2>
          <p className="text-gray-600 mb-4">Standard forms and document templates for your practice.</p>
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            Download Forms →
          </button>
        </div>
      </div>
    </div>
  );
}

export default Resources;