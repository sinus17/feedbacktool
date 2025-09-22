import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { SubmissionForm } from '../components/SubmissionForm';
import { VideoList } from '../components/VideoList';
import { FilterMenu } from '../components/FilterMenu';
import { Pagination } from '../components/Pagination';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const { 
    fetchSubmissions, 
    fetchArtists, 
    setSubmissionsPage, 
    submissionsPagination,
    loading 
  } = useStore();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.email === 'admin@videofeedback.com' || 
                 currentUser?.user_metadata?.team === 'management' ||
                 currentUser?.user_metadata?.team === 'admin';

  // Fetch data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchSubmissions(1, 20, {
            artistId: selectedArtist,
            type: selectedType,
            status: selectedStatus
          }),
          fetchArtists()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [fetchSubmissions, fetchArtists, selectedArtist, selectedType, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Video Submissions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage and review video feedback
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn">
          <Plus className="h-5 w-5 mr-2" />
          New Submission
        </button>
      </div>

      {isAdmin && (
        <FilterMenu
          selectedArtist={selectedArtist}
          setSelectedArtist={setSelectedArtist}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
        />
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <VideoList
          artistId={selectedArtist || undefined}
          filters={{
            artistId: selectedArtist,
            type: selectedType,
            status: selectedStatus,
          }}
        />
        <Pagination
          currentPage={submissionsPagination.currentPage}
          totalPages={submissionsPagination.totalPages}
          totalCount={submissionsPagination.totalCount}
          pageSize={submissionsPagination.pageSize}
          onPageChange={(page) => {
            setSubmissionsPage(page);
            fetchSubmissions(page, 20, {
              artistId: selectedArtist,
              type: selectedType,
              status: selectedStatus
            });
          }}
          loading={loading}
        />
      </div>

      {showForm && (
        <SubmissionForm 
          onClose={() => setShowForm(false)} 
          artistId={selectedArtist || undefined}
        />
      )}
    </div>
  );
};