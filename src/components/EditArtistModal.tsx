import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader, Archive, Search, User, Users, Building, Music } from 'lucide-react';
import { useStore } from '../store';
import type { Artist } from '../types';
import { WhatsAppAPI } from '../services/whatsapp/api';
import { supabase } from '../lib/supabase';

interface EditArtistModalProps {
  artist: Artist;
  onClose: () => void;
}

type TabType = 'artist' | 'contact' | 'customer';

export const EditArtistModal: React.FC<EditArtistModalProps> = ({ artist, onClose }) => {
  const { updateArtist, fetchArtists } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('artist');
  const [formData, setFormData] = useState({
    name: artist.name,
    whatsappGroupId: artist.whatsappGroupId || '',
    spotifyUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
  });
  const [contactData, setContactData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland',
  });
  const [customerData, setCustomerData] = useState({
    name: '',
    type: 'individual' as 'individual' | 'company',
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState(false);
  const [searchingGroup, setSearchingGroup] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [fetchingSpotify, setFetchingSpotify] = useState(false);
  const [spotifyData, setSpotifyData] = useState<any>(null);

  // Load artist extended data, contacts, and customer
  useEffect(() => {
    loadArtistData();
  }, [artist.id]);

  const loadArtistData = async () => {
    try {
      // Load artist extended data
      const { data: artistData } = await supabase
        .from('artists')
        .select('customer_id, spotify_url, instagram_url, tiktok_url, spotify_image, spotify_genres, spotify_popularity, spotify_followers, spotify_related_artists, spotify_last_synced')
        // @ts-ignore - artists table uses TEXT for id
        .eq('id', String(artist.id))
        .single();

      if (artistData && 'customer_id' in artistData) {
        setFormData(prev => ({
          ...prev,
          spotifyUrl: artistData.spotify_url || '',
          instagramUrl: artistData.instagram_url || '',
          tiktokUrl: artistData.tiktok_url || '',
        }));

        // Load Spotify data if available
        if (artistData.spotify_image || artistData.spotify_genres) {
          setSpotifyData({
            image: artistData.spotify_image,
            genres: artistData.spotify_genres,
            popularity: artistData.spotify_popularity,
            followers: artistData.spotify_followers,
            related_artists: artistData.spotify_related_artists,
            last_synced: artistData.spotify_last_synced
          });
        }

        // Load customer if exists
        if (artistData.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', artistData.customer_id)
            .single();
          
          if (customerData && 'name' in customerData) {
            setCustomer(customerData);
            setCustomerData({
              // @ts-ignore - type narrowing issue
              name: customerData.name,
              // @ts-ignore - type narrowing issue
              type: customerData.type,
            });
          }
        }
      }

      // Load contacts
      const { data: contactsData } = await supabase
        .from('artist_contacts')
        .select(`
          contact_id,
          contacts!inner(
            id,
            first_name,
            last_name,
            email,
            phone,
            street,
            zip,
            city,
            country
          )
        `)
        // @ts-ignore - artists table uses TEXT for id
        .eq('artist_id', String(artist.id));

      if (contactsData) {
        setContacts(contactsData.map((ac: any) => ac.contacts));
      }
    } catch (err) {
      console.error('Error loading artist data:', err);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Artist name is required');
      return false;
    }

    if (formData.whatsappGroupId) {
      const cleanId = formData.whatsappGroupId.replace('@g.us', '');
      if (!/^\d{15,}$/.test(cleanId)) {
        setError('Please enter a valid WhatsApp group ID (at least 15 digits)');
        return false;
      }
    }

    return true;
  };

  const handleFetchSpotifyData = async () => {
    if (!formData.spotifyUrl) {
      setError('Please enter a Spotify URL first');
      return;
    }

    setFetchingSpotify(true);
    setError(null);
    setSearchSuccess(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-spotify-artist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ spotify_url: formData.spotifyUrl })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Spotify data');
      }

      const result = await response.json();
      setSpotifyData(result.data);

      // Update database with Spotify data
      await supabase
        .from('artists')
        .update({
          spotify_image: result.data.image,
          spotify_genres: result.data.genres,
          spotify_popularity: result.data.popularity,
          spotify_followers: result.data.followers,
          spotify_related_artists: result.data.related_artists,
          spotify_last_synced: new Date().toISOString()
        } as any)
        // @ts-ignore
        .eq('id', String(artist.id));

      setSearchSuccess(`Spotify data fetched successfully for ${result.data.name}!`);
    } catch (err) {
      console.error('Failed to fetch Spotify data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Spotify data');
    } finally {
      setFetchingSpotify(false);
    }
  };

  const handleSearchGroup = async () => {
    if (!formData.name.trim()) {
      setError('Please enter an artist name first');
      return;
    }

    setSearchingGroup(true);
    setError(null);
    setSearchSuccess(null);

    try {
      const group = await WhatsAppAPI.searchArtistGroup(formData.name.trim());
      
      if (group) {
        // Clean the group ID by removing @g.us suffix if present
        const cleanGroupId = group.id.replace('@g.us', '');
        setFormData({ ...formData, whatsappGroupId: cleanGroupId });
        setSearchSuccess(`Found group: ${group.name}`);
      } else {
        setError(`No WhatsApp group found for "${formData.name.trim()} x SwipeUp"`);
      }
    } catch (err) {
      console.error('Failed to search for group:', err);
      setError(err instanceof Error ? err.message : 'Failed to search for WhatsApp group');
    } finally {
      setSearchingGroup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Update artist
      const { error: updateError } = await supabase
        .from('artists')
        .update({
          name: formData.name.trim(),
          whatsapp_group_id: formData.whatsappGroupId.trim() || null,
          spotify_url: formData.spotifyUrl.trim() || null,
          instagram_url: formData.instagramUrl.trim() || null,
          tiktok_url: formData.tiktokUrl.trim() || null,
        } as any)
        // @ts-ignore - artists table uses TEXT for id
        .eq('id', String(artist.id));

      if (updateError) throw updateError;
      await fetchArtists();
      onClose();
    } catch (err) {
      console.error('Failed to update artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to update artist');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!contactData.email || !contactData.firstName || !contactData.lastName) {
      setError('Please fill in all required contact fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create or get customer first
      let customerId = customer?.id;
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerData.name || contactData.firstName + ' ' + contactData.lastName,
            type: customerData.type,
          } as any)
          .select()
          .single();

        if (customerError) throw customerError;
        // @ts-ignore - newCustomer is guaranteed to have id
        customerId = newCustomer?.id;
        setCustomer(newCustomer);

        // Link customer to artist
        await supabase
          .from('artists')
          .update({ customer_id: customerId } as any)
          // @ts-ignore - artists table uses TEXT for id
          .eq('id', String(artist.id));
      }

      // Create contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          customer_id: customerId,
          first_name: contactData.firstName,
          last_name: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          street: contactData.street,
          zip: contactData.zip,
          city: contactData.city,
          country: contactData.country,
        } as any)
        .select()
        .single();

      if (contactError) throw contactError;

      // Link contact to artist
      await supabase
        .from('artist_contacts')
        .insert({
          artist_id: String(artist.id),
          // @ts-ignore - newContact is guaranteed to have id
          contact_id: newContact?.id,
        } as any);

      // Reload data
      await loadArtistData();
      
      // Reset form
      setContactData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        street: '',
        zip: '',
        city: '',
        country: 'Deutschland',
      });

      setSearchSuccess('Contact added successfully!');
      setTimeout(() => setSearchSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerData.name) {
      setError('Please enter a customer name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (customer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            type: customerData.type,
          } as any)
          .eq('id', customer.id);

        if (updateError) throw updateError;
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            name: customerData.name,
            type: customerData.type,
          } as any)
          .select()
          .single();

        if (createError) throw createError;

        // Link customer to artist
        await supabase
          .from('artists')
          // @ts-ignore - newCustomer is guaranteed to have id
          .update({ customer_id: newCustomer?.id } as any)
          // @ts-ignore - artists table uses TEXT for id
          .eq('id', String(artist.id));

        setCustomer(newCustomer);
      }

      setSearchSuccess('Customer saved successfully!');
      setTimeout(() => setSearchSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    setError(null);


    try {
      const { error: updateError } = await updateArtist(String(artist.id), {
        archived: !artist.archived
      });

      if (updateError) throw updateError;
      onClose();
    } catch (err) {
      console.error('Failed to archive artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive artist');
    } finally {
      setLoading(false);
      setArchiveConfirmation(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1F2937] rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Edit Artist</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {searchSuccess && (
          <div className="mb-4 flex items-center gap-2 text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <Search className="h-5 w-5 flex-shrink-0" />
            <p>{searchSuccess}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('artist')}
            className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'artist'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <User className="h-4 w-4 mr-2" />
            Artist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'contact'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Contacts ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'customer'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Building className="h-4 w-4 mr-2" />
            Customer
          </button>
        </div>

        {/* Artist Tab */}
        {activeTab === 'artist' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              WhatsApp Group ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="120363298754236172 (at least 15 digits)"
                value={formData.whatsappGroupId}
                onChange={(e) => setFormData({ ...formData, whatsappGroupId: e.target.value })}
                disabled={loading || searchingGroup}
              />
              <button
                type="button"
                onClick={handleSearchGroup}
                disabled={loading || searchingGroup || !formData.name.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {searchingGroup ? (
                  <Loader className="animate-spin h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the numeric group ID manually or click search to find "{formData.name.trim()} x SwipeUp"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Spotify URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://open.spotify.com/artist/..."
                value={formData.spotifyUrl}
                onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
                disabled={loading || fetchingSpotify}
              />
              <button
                type="button"
                onClick={handleFetchSpotifyData}
                disabled={loading || fetchingSpotify || !formData.spotifyUrl}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                title="Fetch artist data from Spotify"
              >
                {fetchingSpotify ? (
                  <Loader className="animate-spin h-4 w-4" />
                ) : (
                  <Music className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Click the music icon to fetch artist image, genres, and related artists from Spotify
            </p>
          </div>

          {/* Spotify Data Display */}
          {spotifyData && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
                <Music className="h-4 w-4 mr-2" />
                Spotify Data
              </h3>
              <div className="space-y-3">
                {spotifyData.image && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Profile Image:</p>
                    <img 
                      src={spotifyData.image} 
                      alt="Artist" 
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </div>
                )}
                {spotifyData.genres && spotifyData.genres.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Genres:</p>
                    <div className="flex flex-wrap gap-1">
                      {spotifyData.genres.map((genre: string, idx: number) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {spotifyData.popularity !== undefined && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Popularity: {spotifyData.popularity}/100</p>
                  </div>
                )}
                {spotifyData.followers !== undefined && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Followers: {spotifyData.followers.toLocaleString()}</p>
                  </div>
                )}
                {spotifyData.related_artists && spotifyData.related_artists.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Similar Artists:</p>
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      {spotifyData.related_artists.slice(0, 5).map((ra: any) => ra.name).join(', ')}
                    </div>
                  </div>
                )}
                {spotifyData.last_synced && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Last synced: {new Date(spotifyData.last_synced).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Instagram URL
            </label>
            <input
              type="url"
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://instagram.com/..."
              value={formData.instagramUrl}
              onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              TikTok URL
            </label>
            <input
              type="url"
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://tiktok.com/@..."
              value={formData.tiktokUrl}
              onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
              disabled={loading}
            />
          </div>


          <div className="flex justify-between space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setArchiveConfirmation(true)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                artist.archived
                  ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                  : 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300'
              }`}
              disabled={loading}
            >
              <Archive className="h-5 w-5 mr-2" />
              {artist.archived ? 'Unarchive' : 'Archive'}
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {loading ? 'Updating...' : 'Update Artist'}
              </button>
            </div>
          </div>
        </form>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            {/* Existing Contacts */}
            {contacts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 dark:text-gray-200">Existing Contacts</h3>
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="font-medium dark:text-white">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{contact.email}</p>
                      {contact.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{contact.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Contact Form */}
            <h3 className="text-sm font-medium mb-3 dark:text-gray-200">Add New Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={contactData.firstName}
                  onChange={(e) => setContactData({ ...contactData, firstName: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={contactData.lastName}
                  onChange={(e) => setContactData({ ...contactData, lastName: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Phone
              </label>
              <input
                type="tel"
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={contactData.phone}
                onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Street
              </label>
              <input
                type="text"
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={contactData.street}
                onChange={(e) => setContactData({ ...contactData, street: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                  ZIP
                </label>
                <input
                  type="text"
                  className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={contactData.zip}
                  onChange={(e) => setContactData({ ...contactData, zip: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                  City
                </label>
                <input
                  type="text"
                  className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={contactData.city}
                  onChange={(e) => setContactData({ ...contactData, city: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Country
              </label>
              <input
                type="text"
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={contactData.country}
                onChange={(e) => setContactData({ ...contactData, country: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSaveContact}
                disabled={loading}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {loading ? 'Saving...' : 'Add Contact'}
              </button>
            </div>
          </div>
        )}

        {/* Customer Tab */}
        {activeTab === 'customer' && (
          <div className="space-y-4">
            {customer && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Customer already exists: {customer.name} ({customer.type})
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={customerData.type}
                onChange={(e) => setCustomerData({ ...customerData, type: e.target.value as 'individual' | 'company' })}
                disabled={loading}
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={loading}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {loading ? 'Saving...' : (customer ? 'Update Customer' : 'Create Customer')}
              </button>
            </div>
          </div>
        )}
      </div>

      {archiveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1F2937] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              {artist.archived ? 'Unarchive Artist' : 'Archive Artist'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to {artist.archived ? 'unarchive' : 'archive'} {artist.name}?
              {!artist.archived && ' This will also archive all associated videos.'}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setArchiveConfirmation(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={loading}
                className="btn bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {loading ? 'Processing...' : (artist.archived ? 'Unarchive' : 'Archive')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};