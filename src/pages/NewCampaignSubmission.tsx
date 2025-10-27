import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User, Building, Calendar, DollarSign, Target, Upload, Music, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CampaignSubmissionData {
  // Step 1: User type
  user_type: 'artist' | 'manager' | '';
  
  // Step 1.5: Customer status
  customer_status: string; // 'new' | 'existing' | ''
  
  // Step 1.7: Phone verification (for existing customers)
  verification_phone: string;
  verification_code: string; // User input
  generated_code: string; // Internal storage for verification
  is_phone_verified: boolean;
  
  // Artist/Contact data
  kuenstlername: string;
  vorname: string;
  nachname: string;
  firma: string;
  email: string;
  telefon: string;
  
  // Artist address
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  vat_id: string;
  
  // Billing address (if different)
  billing_same_as_artist: boolean;
  billing_vorname: string;
  billing_nachname: string;
  billing_firma: string;
  billing_strasse: string;
  billing_plz: string;
  billing_ort: string;
  billing_land: string;
  billing_email: string;
  billing_telefon: string;
  
  // Release information
  release_name: string;
  release_date: string;
  master_datei_link: string;
  master_datei_file?: File;
  cover_link: string;
  cover_file?: File;
  spotify_uri: string;
  facebook_page_url: string;
  content_ordner: string;
  
  // Budget & services
  werbebudget_netto: number;
  content_strategy_upsell: boolean;
  voucher_promocode: string;
  
  // Final confirmation
  final_confirmation: boolean;
}

const NewCampaignSubmission: React.FC = () => {
  const [formData, setFormData] = useState<CampaignSubmissionData>({
    // Step 1: User type
    user_type: '',
    
    // Step 1.5: Customer status
    customer_status: '',
    
    // Step 1.7: Phone verification (for existing customers)
    verification_phone: '',
    verification_code: '',
    generated_code: '',
    is_phone_verified: false,
    
    // Artist/Contact data
    kuenstlername: '',
    vorname: '',
    nachname: '',
    firma: '',
    email: '',
    telefon: '',
    
    // Artist address
    strasse: '',
    plz: '',
    ort: '',
    land: 'Deutschland',
    vat_id: '',
    
    // Billing address (if different)
    billing_same_as_artist: true,
    billing_vorname: '',
    billing_nachname: '',
    billing_firma: '',
    billing_strasse: '',
    billing_plz: '',
    billing_ort: '',
    billing_land: 'Deutschland',
    billing_email: '',
    billing_telefon: '',
    
    // Release information
    release_name: '',
    release_date: '',
    master_datei_link: '',
    cover_link: '',
    spotify_uri: '',
    facebook_page_url: '',
    content_ordner: '',
    
    // Budget & services
    werbebudget_netto: 650,
    content_strategy_upsell: false,
    voucher_promocode: '',
    
    // Final confirmation
    final_confirmation: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [associatedArtists, setAssociatedArtists] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Country mapping from English to German names
  const mapCountryToGerman = (englishName: string): string => {
    const countryMap: { [key: string]: string } = {
      'Germany': 'Deutschland',
      'Austria': 'Österreich', 
      'Switzerland': 'Schweiz',
      'Belgium': 'Belgien',
      'Netherlands': 'Niederlande',
      'France': 'Frankreich',
      'Italy': 'Italien',
      'Spain': 'Spanien',
      'Portugal': 'Portugal',
      'Poland': 'Polen',
      'Czech Republic': 'Tschechien',
      'Hungary': 'Ungarn',
      'Slovakia': 'Slowakei',
      'Slovenia': 'Slowenien',
      'Croatia': 'Kroatien',
      'Denmark': 'Dänemark',
      'Sweden': 'Schweden',
      'Norway': 'Norwegen',
      'Finland': 'Finnland',
      'United Kingdom': 'Vereinigtes Königreich',
      'Ireland': 'Irland',
      'Luxembourg': 'Luxemburg',
      'Estonia': 'Estland',
      'Latvia': 'Lettland',
      'Lithuania': 'Litauen',
      'Romania': 'Rumänien',
      'Bulgaria': 'Bulgarien',
      'Greece': 'Griechenland',
      'Cyprus': 'Zypern',
      'Malta': 'Malta',
      'United States': 'USA',
      'Canada': 'Kanada',
      'Australia': 'Australien',
      'New Zealand': 'Neuseeland',
      'Japan': 'Japan',
      'South Korea': 'Südkorea',
      'Singapore': 'Singapur',
      'Hong Kong': 'Hongkong',
      'Brazil': 'Brasilien',
      'Mexico': 'Mexiko',
      'Argentina': 'Argentinien',
      'Chile': 'Chile',
      'Colombia': 'Kolumbien',
      'Peru': 'Peru',
      'South Africa': 'Südafrika',
      'Israel': 'Israel',
      'Turkey': 'Türkei',
      'Russia': 'Russland',
      'Ukraine': 'Ukraine',
      'Serbia': 'Serbien',
      'Bosnia and Herzegovina': 'Bosnien und Herzegowina',
      'North Macedonia': 'Nordmazedonien',
      'Montenegro': 'Montenegro',
      'Albania': 'Albanien',
      'Kosovo': 'Kosovo',
      'Moldova': 'Moldau',
      'Belarus': 'Belarus',
      'Georgia': 'Georgien',
      'Armenia': 'Armenien',
      'Azerbaijan': 'Aserbaidschan',
      'Kazakhstan': 'Kasachstan',
      'China': 'China',
      'India': 'Indien',
      'Thailand': 'Thailand',
      'Vietnam': 'Vietnam',
      'Philippines': 'Philippinen',
      'Indonesia': 'Indonesien',
      'Malaysia': 'Malaysia',
      'Taiwan': 'Taiwan',
      'Egypt': 'Ägypten',
      'Morocco': 'Marokko',
      'Tunisia': 'Tunesien',
      'Algeria': 'Algerien',
      'Nigeria': 'Nigeria',
      'Kenya': 'Kenia',
      'Ghana': 'Ghana'
    };
    return countryMap[englishName] || 'Deutschland'; // Default to Deutschland if not found
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const germanCountryName = mapCountryToGerman(data.country_name);
        setFormData((prev: CampaignSubmissionData) => ({ ...prev, land: germanCountryName }));
      } catch (error) {
        console.error('Error fetching location:', error);
        // Keep default 'Deutschland' if geolocation fails
      }
    };
    fetchLocation();
  }, []);

  const sendWhatsAppVerification = async () => {
    if (!formData.verification_phone) {
      toast.error('Bitte gib eine Telefonnummer ein');
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the generated code internally (not in user input field)
      setFormData((prev: CampaignSubmissionData) => ({ ...prev, generated_code: verificationCode }));
      
      const response = await fetch('https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/send-whatsapp-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          phone: formData.verification_phone,
          code: verificationCode,
          name: 'Kunde' // Generic name for campaign form
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Senden des Codes');
      }

      await response.json(); // Consume response
      toast.success('Verifikationscode wurde per WhatsApp gesendet!');
      
    } catch (error) {
      console.error('Error sending WhatsApp verification:', error);
      toast.error('Fehler beim Senden des WhatsApp-Codes. Bitte versuche es erneut.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const verifyCode = async () => {
    console.log('🔐 verifyCode called');
    console.log('🔐 Verification code:', formData.verification_code);
    console.log('🔐 Generated code:', formData.generated_code);
    
    if (!formData.verification_code || formData.verification_code.length !== 6) {
      toast.error('Bitte gib einen 6-stelligen Code ein');
      return;
    }

    if (formData.verification_code !== formData.generated_code) {
      toast.error('Ungültiger Code. Bitte versuche es erneut.');
      return;
    }

    try {
      console.log('🔐 Marking phone as verified...');
      
      // Update state and wait for it to complete
      await new Promise<void>((resolve) => {
        setFormData((prev: CampaignSubmissionData) => {
          console.log('🔐 Updating formData - is_phone_verified: true');
          const newData = { ...prev, is_phone_verified: true };
          // Use setTimeout to ensure state update completes
          setTimeout(() => resolve(), 0);
          return newData;
        });
      });
      
      console.log('🔐 Looking up artists...');
      // Look up artists associated with this phone number
      await lookupArtistsByPhone(formData.verification_phone);
      
      console.log('🔐 Verification complete!');
      toast.success('Code erfolgreich verifiziert!');
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error('Fehler bei der Verifizierung');
    }
  };

  const lookupArtistsByPhone = async (phone: string) => {
    try {
      console.log('🔍 Looking up artists for phone:', phone);
      console.log('🔍 Form data phone:', formData.verification_phone);
      console.log('🔍 Phone verified status:', formData.is_phone_verified);
      
      // Clean and format phone number for search
      const cleanPhone = formData.verification_phone.replace(/[\s\-\(\)]/g, '');
      let searchPhones = [cleanPhone];
      
      // Add variations for German numbers
      if (cleanPhone.startsWith('+49')) {
        searchPhones.push(cleanPhone.substring(3)); // Remove +49
        searchPhones.push('0' + cleanPhone.substring(3)); // Add 0 prefix
      } else if (cleanPhone.startsWith('49')) {
        searchPhones.push('+' + cleanPhone); // Add + prefix
        searchPhones.push('0' + cleanPhone.substring(2)); // Replace 49 with 0
      } else if (cleanPhone.startsWith('0')) {
        searchPhones.push('49' + cleanPhone.substring(1)); // Replace 0 with 49
        searchPhones.push('+49' + cleanPhone.substring(1)); // Replace 0 with +49
      }
      
      console.log('Searching for phone variations:', searchPhones);
      
      // Search for contacts with matching phone numbers
      const { data: contacts, error: contactError } = await (supabase as any)
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          customer_id,
          customers!inner(id, name)
        `)
        .or(searchPhones.map(phone => `phone.eq.${phone}`).join(','));
      
      if (contactError) {
        console.error('Error searching contacts:', contactError);
        throw contactError;
      }
      
      console.log('Found contacts:', contacts);
      
      // Get associated artists for found contacts
      let artists: any[] = [];
      
      if (contacts && contacts.length > 0) {
        const contactIds = contacts.map((c: any) => c.id);
        
        const { data: artistContacts, error: artistError } = await (supabase as any)
          .from('artist_contacts')
          .select(`
            artist_id,
            artists!inner(
              id,
              name,
              spotify_url,
              instagram_url,
              tiktok_url
            )
          `)
          .in('contact_id', contactIds);
        
        if (artistError) {
          console.error('Error searching artists:', artistError);
        } else if (artistContacts) {
          artists = artistContacts.map((ac: any) => ({
            id: ac.artists.id,
            name: ac.artists.name,
            spotify_url: ac.artists.spotify_url,
            instagram_url: ac.artists.instagram_url,
            tiktok_url: ac.artists.tiktok_url,
            contact: contacts.find((c: any) => contactIds.includes(c.id))
          }));
        }
      }
      
      console.log('🎯 Found artists:', artists);
      console.log('🎯 Setting associated artists, length:', artists.length);
      setAssociatedArtists(artists);
      
      // Force a re-render to ensure UI updates
      setTimeout(() => {
        console.log('🎯 After timeout - Associated artists:', associatedArtists.length);
        console.log('🎯 Phone verified:', formData.is_phone_verified);
      }, 100);
      
      if (artists.length === 0) {
        // No artists found - show option to create new artist
        toast.success(`Keine Künstler für Nummer ${formData.verification_phone} gefunden. Du kannst einen neuen Künstler anlegen.`);
      } else {
        // Artists found - show selection
        toast.success(`${artists.length} Künstler für diese Nummer gefunden.`);
      }
    } catch (error) {
      console.error('Error looking up artists:', error);
      toast.error('Fehler beim Laden der Künstlerdaten');
    }
  };

  const selectExistingArtist = (artist: any) => {
    console.log('🎯 Selecting existing artist:', artist);
    // Pre-fill form data with selected artist information
    setFormData((prev: CampaignSubmissionData) => ({
      ...prev,
      kuenstlername: artist.name,
      vorname: artist.contact?.first_name || '',
      nachname: artist.contact?.last_name || '',
      email: artist.contact?.email || '',
      telefon: artist.contact?.phone || formData.verification_phone,
      // Mark as existing artist
      selected_artist_id: artist.id
    }));
    
    // Proceed to step 2 (contact data will be pre-filled)
    setCurrentStep(2);
    toast.success(`Künstler "${artist.name}" ausgewählt`);
  };

  const createNewArtist = () => {
    // Skip artist selection and proceed to contact data entry
    setCurrentStep(2);
    toast.success('Neuer Künstler wird angelegt');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev: CampaignSubmissionData) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Auto-advance to customer status step when user_type is selected
    if (name === 'user_type' && (value === 'artist' || value === 'manager')) {
      setTimeout(() => {
        setCurrentStep(1.5); // Go to customer status step
      }, 300); // Small delay for smooth transition
    }
    
    // Auto-advance from customer status to appropriate next step
    if (name === 'customer_status' && (value === 'new' || value === 'existing')) {
      setTimeout(() => {
        if (value === 'new') {
          setCurrentStep(2); // Go directly to contact data for new customers
        } else {
          setCurrentStep(1.7); // Go to phone verification for existing customers
        }
      }, 300);
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev: CampaignSubmissionData) => ({
      ...prev,
      [name]: checked
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
      case 1.5:
      case 1.7:
        // Step 1 variants: Wer bist du? - phone verification required for 1.7
        if (step === 1.7) {
          return !!(formData.user_type && formData.is_phone_verified);
        }
        return !!(formData.user_type);
      case 2:
        // Step 2: Künstler & Kontaktdaten - firma is optional
        return !!(formData.kuenstlername && formData.vorname && formData.nachname && 
                 formData.email && formData.telefon);
      case 3:
        // Step 3: Rechungs-Adresse - VAT ID required if not Deutschland
        const addressFieldsValid = !!(formData.strasse && formData.plz && formData.ort && formData.land);
        const vatIdValid = formData.land === 'Deutschland' || !!(formData.vat_id);
        return addressFieldsValid && vatIdValid;
      case 4:
        // Step 4: Release-Informationen
        return !!(formData.release_name && formData.release_date);
      case 5:
        // Step 5: Budget & Zusatzleistungen
        return formData.werbebudget_netto >= 650;
      default:
        return true;
    }
  };

  const nextStep = async () => {
    console.log('🚀 nextStep called - currentStep:', currentStep);
    console.log('🚀 Phone verified:', formData.is_phone_verified);
    console.log('🚀 Verification code:', formData.verification_code);
    console.log('🚀 Code length:', formData.verification_code?.length);
    
    // If on step 1.7 and phone verification is needed
    if (currentStep === 1.7 && !formData.is_phone_verified && formData.verification_code && formData.verification_code.length === 6) {
      console.log('🚀 Triggering code verification...');
      await verifyCode();
      return;
    }
    
    console.log('🚀 Validating step:', currentStep);
    if (validateStep(currentStep)) {
      console.log('🚀 Step valid, moving to next step');
      // Handle decimal steps properly
      if (currentStep === 1) {
        setCurrentStep(1.5);
      } else if (currentStep === 1.5) {
        setCurrentStep(1.7);
      } else if (currentStep === 1.7) {
        setCurrentStep(2);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      }
    } else {
      console.log('🚀 Step validation failed');
      toast.error('Bitte fülle alle Pflichtfelder aus');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all steps before submission
    for (let step = 1; step <= 5; step++) {
      if (!validateStep(step)) {
        toast.error(`Bitte fülle alle Pflichtfelder in Schritt ${step} aus`);
        setCurrentStep(step);
        return;
      }
    }
    
    // Check final confirmation
    if (!formData.final_confirmation) {
      toast.error('Bitte bestätige die Kampagnenbuchung');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/submit-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          ...formData,
          werbebudget_netto: formData.werbebudget_netto * 100
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Senden der Kampagne');
      }

      toast.success('Kampagne erfolgreich eingereicht! Wir melden uns in Kürze bei dir.');
      
      setFormData({
        // Step 1: User type
        user_type: '',
        
        // Step 1.5: Customer status
        customer_status: '',
        
        // Step 1.7: Phone verification (for existing customers)
        verification_phone: '',
        verification_code: '',
        generated_code: '',
        is_phone_verified: false,
        
        // Artist/Contact data
        kuenstlername: '',
        vorname: '',
        nachname: '',
        firma: '',
        email: '',
        telefon: '',
        
        // Artist address
        strasse: '',
        plz: '',
        ort: '',
        land: 'Deutschland',
        vat_id: '',
        
        // Billing address (if different)
        billing_same_as_artist: true,
        billing_vorname: '',
        billing_nachname: '',
        billing_firma: '',
        billing_strasse: '',
        billing_plz: '',
        billing_ort: '',
        billing_land: 'Deutschland',
        billing_email: '',
        billing_telefon: '',
        
        // Release information
        release_name: '',
        release_date: '',
        master_datei_link: '',
        cover_link: '',
        spotify_uri: '',
        facebook_page_url: '',
        content_ordner: '',
        
        // Budget & services
        werbebudget_netto: 650,
        content_strategy_upsell: false,
        voucher_promocode: '',
        
        // Final confirmation
        final_confirmation: false,
      });
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Error submitting campaign:', error);
      toast.error('Fehler beim Senden der Kampagne. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black font-sans">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/plane_white.png" 
              alt="SwipeUp Logo" 
              className="h-14 mx-auto"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            NEUE KAMPAGNE
          </h1>
          <p className="text-base text-white max-w-3xl mx-auto">
            Bitte gib uns alle Informationen zu deiner nächsten Veröffentlichung, damit wir deine Kampagne rechtzeitig vorbereiten & Release einplanen können.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'text-white bg-[#0000fe]' 
                    : 'text-white bg-gray-800'
                }`}>
                  {step}
                </div>
                {step < 5 && (
                  <div className={`h-1 w-20 mx-2 ${
                    step < currentStep ? '' : 'bg-gray-800'
                  }`} style={{
                    backgroundColor: step < currentStep ? '#0000fe' : undefined
                  }} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Wer bist du?</span>
            <span>Kontakt</span>
            <span>Rechnung</span>
            <span>Release</span>
            <span>Budget</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-black backdrop-blur-lg rounded-3xl p-8 border border-gray-800 shadow-2xl">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Wer bist du? */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <User className="w-12 h-12 text-[#0000fe] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Wer bist du?</h2>
                    <p className="text-white">Bitte wähle aus, wer die Kampagne anlegt</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <label className={`flex items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.user_type === 'artist' 
                          ? 'border-[#0000fe] bg-[#0000fe]/10' 
                          : 'border-gray-800 hover:border-[#0000fe]'
                      }`}>
                        <input
                          type="radio"
                          name="user_type"
                          value="artist"
                          checked={formData.user_type === 'artist'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-center w-full">
                          <User className="w-8 h-8 text-[#0000fe] mr-4" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">Artist</h3>
                            <p className="text-white text-sm">Ich lege die Kampagne für mich selbst an</p>
                          </div>
                        </div>
                      </label>

                      <label className={`flex items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.user_type === 'manager' 
                          ? 'border-[#0000fe] bg-[#0000fe]/10' 
                          : 'border-gray-800 hover:border-[#0000fe]'
                      }`}>
                        <input
                          type="radio"
                          name="user_type"
                          value="manager"
                          checked={formData.user_type === 'manager'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-center w-full">
                          <Building className="w-8 h-8 text-[#0000fe] mr-4" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">Management/Label</h3>
                            <p className="text-white text-sm">Ich lege die Kampagne im Namen meines Artists an</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1.5: Customer Status */}
              {currentStep === 1.5 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Building className="w-12 h-12 text-[#0000fe] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Neukunde / Bestandskunde?</h2>
                    <p className="text-white">Haben wir in der Vergangenheit mit dem Artist gearbeitet?</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <label className={`flex items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.customer_status === 'existing' 
                          ? 'border-[#0000fe] bg-[#0000fe]/10' 
                          : 'border-gray-800 hover:border-[#0000fe]'
                      }`}>
                        <input
                          type="radio"
                          name="customer_status"
                          value="existing"
                          checked={formData.customer_status === 'existing'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-center w-full">
                          <User className="w-8 h-8 text-green-400 mr-4" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">Ja</h3>
                            <p className="text-white text-sm">Wir haben bereits zusammengearbeitet</p>
                          </div>
                        </div>
                      </label>

                      <label className={`flex items-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.customer_status === 'new' 
                          ? 'border-[#0000fe] bg-[#0000fe]/10' 
                          : 'border-gray-800 hover:border-[#0000fe]'
                      }`}>
                        <input
                          type="radio"
                          name="customer_status"
                          value="new"
                          checked={formData.customer_status === 'new'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex items-center w-full">
                          <Building className="w-8 h-8 text-[#0000fe] mr-4" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">Nein</h3>
                            <p className="text-white text-sm">Das ist unsere erste Zusammenarbeit</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1.7: Phone Verification (for existing customers) */}
              {currentStep === 1.7 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                    <h2 className="text-2xl font-bold text-white mb-2">WhatsApp Verifizierung</h2>
                    <p className="text-sm text-white">Bitte gib deine Handynummer ein, damit wir dir einen Bestätigungscode per WhatsApp senden können</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <svg className="w-4 h-4 inline mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        Handynummer *
                      </label>
                      <input
                        type="tel"
                        name="verification_phone"
                        value={formData.verification_phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="+49 123 456 7890"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Wir senden dir einen Bestätigungscode per WhatsApp
                      </p>
                    </div>

                    {!formData.is_phone_verified && formData.verification_phone && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={sendWhatsAppVerification}
                          disabled={isSendingWhatsApp}
                          className="px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: '#0000fe' }}
                        >
                          {isSendingWhatsApp ? 'Sende Code...' : 'Code per WhatsApp senden'}
                        </button>
                      </div>
                    )}

                    {formData.verification_phone && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Bestätigungscode
                        </label>
                        <input
                          type="text"
                          name="verification_code"
                          value={formData.verification_code}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                          placeholder="Gib den 6-stelligen Code ein"
                          maxLength={6}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Code aus der WhatsApp-Nachricht eingeben
                        </p>
                        
                      </div>
                    )}

                    {(formData.is_phone_verified || associatedArtists.length > 0) && (
                      <div className="space-y-6 mt-6">
                        <div className="text-center p-6 bg-[#0000fe]/10 border border-[#0000fe]/20 rounded-lg">
                          <h3 className="text-lg font-semibold text-white mb-2">Künstler auswählen</h3>
                          
                          <div className="space-y-4">
                            <p className="text-white">Wähle einen Künstler aus oder lege einen neuen an:</p>
                            
                            {associatedArtists.length > 0 && associatedArtists.map((artist, index) => (
                              <div key={index} className="p-4 bg-gray-900 border border-gray-800 rounded-lg cursor-pointer hover:border-[#0000fe] transition-colors">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-white">{artist.name}</h4>
                                    <p className="text-sm text-gray-400">{artist.contact?.email || artist.email}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => selectExistingArtist(artist)}
                                    className="px-4 py-2 text-white font-medium rounded-lg transition-colors" style={{ backgroundColor: '#0000fe' }}
                                  >
                                    Auswählen
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            <button
                              type="button"
                              onClick={createNewArtist}
                              className="w-full px-6 py-3 text-white font-medium rounded-lg border border-gray-600 hover:border-[#0000fe] transition-colors bg-transparent"
                            >
                              Neuen Künstler & Release anlegen
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Künstler & Kontaktdaten */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <User className="w-12 h-12 text-[#0000fe] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {formData.user_type === 'artist' ? 'Deine Daten' : 'Künstler & Kontaktdaten'}
                    </h2>
                    <p className="text-white">
                      {formData.user_type === 'artist' 
                        ? 'Bitte gib uns deine grundlegenden Informationen' 
                        : 'Bitte gib uns die Daten des Künstlers und deine Kontaktdaten'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <User className="w-4 h-4 inline mr-2" />
                        Künstlername *
                      </label>
                      <input
                        type="text"
                        name="kuenstlername"
                        value={formData.kuenstlername}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Dein Künstlername"
                        maxLength={255}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Vorname *
                      </label>
                      <input
                        type="text"
                        name="vorname"
                        value={formData.vorname}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Dein Vorname"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Bei den persönlichen Informationen bitte die Daten des Rechnungsempfängers angeben.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Nachname *
                      </label>
                      <input
                        type="text"
                        name="nachname"
                        value={formData.nachname}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Dein Nachname"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <Building className="w-4 h-4 inline mr-2" />
                        Firma
                      </label>
                      <input
                        type="text"
                        name="firma"
                        value={formData.firma}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Firmenname (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        E-Mail *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="deine@email.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Telefon *
                      </label>
                      <input
                        type="tel"
                        name="telefon"
                        value={formData.telefon}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="+49 123 456789"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <MapPin className="w-12 h-12 text-[#0000fe] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Rechungs-Adresse</h2>
                    <p className="text-white">Für die Rechnungsstellung benötigen wir deine Adresse</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Straße & Hausnummer *
                      </label>
                      <input
                        type="text"
                        name="strasse"
                        value={formData.strasse}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Musterstraße 123"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        PLZ *
                      </label>
                      <input
                        type="text"
                        name="plz"
                        value={formData.plz}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="12345"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Ort *
                      </label>
                      <input
                        type="text"
                        name="ort"
                        value={formData.ort}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Musterstadt"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Land *
                      </label>
                      <select
                        name="land"
                        value={formData.land}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        required
                      >
                        <option value="Deutschland">Deutschland</option>
                        <option value="Österreich">Österreich</option>
                        <option value="Schweiz">Schweiz</option>
                        <option value="Belgien">Belgien</option>
                        <option value="Niederlande">Niederlande</option>
                        <option value="Frankreich">Frankreich</option>
                        <option value="Italien">Italien</option>
                        <option value="Spanien">Spanien</option>
                        <option value="Portugal">Portugal</option>
                        <option value="Polen">Polen</option>
                        <option value="Tschechien">Tschechien</option>
                        <option value="Ungarn">Ungarn</option>
                        <option value="Slowakei">Slowakei</option>
                        <option value="Slowenien">Slowenien</option>
                        <option value="Kroatien">Kroatien</option>
                        <option value="Dänemark">Dänemark</option>
                        <option value="Schweden">Schweden</option>
                        <option value="Norwegen">Norwegen</option>
                        <option value="Finnland">Finnland</option>
                        <option value="Vereinigtes Königreich">Vereinigtes Königreich</option>
                        <option value="Irland">Irland</option>
                        <option value="Luxemburg">Luxemburg</option>
                        <option value="Estland">Estland</option>
                        <option value="Lettland">Lettland</option>
                        <option value="Litauen">Litauen</option>
                        <option value="Rumänien">Rumänien</option>
                        <option value="Bulgarien">Bulgarien</option>
                        <option value="Griechenland">Griechenland</option>
                        <option value="Zypern">Zypern</option>
                        <option value="Malta">Malta</option>
                        <option value="USA">USA</option>
                        <option value="Kanada">Kanada</option>
                        <option value="Australien">Australien</option>
                        <option value="Neuseeland">Neuseeland</option>
                        <option value="Japan">Japan</option>
                        <option value="Südkorea">Südkorea</option>
                        <option value="Singapur">Singapur</option>
                        <option value="Hongkong">Hongkong</option>
                        <option value="Brasilien">Brasilien</option>
                        <option value="Mexiko">Mexiko</option>
                        <option value="Argentinien">Argentinien</option>
                        <option value="Chile">Chile</option>
                        <option value="Kolumbien">Kolumbien</option>
                        <option value="Peru">Peru</option>
                        <option value="Südafrika">Südafrika</option>
                        <option value="Israel">Israel</option>
                        <option value="Türkei">Türkei</option>
                        <option value="Russland">Russland</option>
                        <option value="Ukraine">Ukraine</option>
                        <option value="Serbien">Serbien</option>
                        <option value="Bosnien und Herzegowina">Bosnien und Herzegowina</option>
                        <option value="Nordmazedonien">Nordmazedonien</option>
                        <option value="Montenegro">Montenegro</option>
                        <option value="Albanien">Albanien</option>
                        <option value="Kosovo">Kosovo</option>
                        <option value="Moldau">Moldau</option>
                        <option value="Belarus">Belarus</option>
                        <option value="Georgien">Georgien</option>
                        <option value="Armenien">Armenien</option>
                        <option value="Aserbaidschan">Aserbaidschan</option>
                        <option value="Kasachstan">Kasachstan</option>
                        <option value="China">China</option>
                        <option value="Indien">Indien</option>
                        <option value="Thailand">Thailand</option>
                        <option value="Vietnam">Vietnam</option>
                        <option value="Philippinen">Philippinen</option>
                        <option value="Indonesien">Indonesien</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="Taiwan">Taiwan</option>
                        <option value="Ägypten">Ägypten</option>
                        <option value="Marokko">Marokko</option>
                        <option value="Tunesien">Tunesien</option>
                        <option value="Algerien">Algerien</option>
                        <option value="Nigeria">Nigeria</option>
                        <option value="Kenia">Kenia</option>
                        <option value="Ghana">Ghana</option>
                        <option value="Andere">Andere</option>
                      </select>
                    </div>

                    {/* VAT ID field - only show if country is not Deutschland */}
                    {formData.land !== 'Deutschland' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-white mb-2">
                          <Building className="w-4 h-4 inline mr-2" />
                          VAT ID / Steuer-ID *
                        </label>
                        <input
                          type="text"
                          name="vat_id"
                          value={formData.vat_id}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                          placeholder="z.B. DE123456789, AT U12345678"
                          required
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Für Kunden außerhalb Deutschlands ist die Angabe der VAT ID / Steuer-ID für die Rechnungsstellung erforderlich.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <Music className="w-12 h-12 text-[#0000fe] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Release-Informationen</h2>
                    <p className="text-white">Alle Informationen zu deiner Veröffentlichung</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        <Music className="w-4 h-4 inline mr-2" />
                        Name deiner VÖ *
                      </label>
                      <input
                        type="text"
                        name="release_name"
                        value={formData.release_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="Song-Titel (ohne feat. XY)"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Bei Songs mit Feature Artist bitte nur den Song-Titel, nicht (feat. XY) angeben.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Release-Datum *
                      </label>
                      <input
                        type="text"
                        name="release_date"
                        value={formData.release_date}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                          if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                          setFormData(prev => ({ ...prev, release_date: value }));
                        }}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        pattern="\d{2}/\d{2}/\d{4}"
                        placeholder="dd/mm/yyyy"
                        maxLength={10}
                        required
                      />
                    </div>


                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        <Upload className="w-4 h-4 inline mr-2" />
                        Master-Datei
                      </label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            name="master_datei_file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormData(prev => ({ ...prev, master_datei_file: file }));
                              }
                            }}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="url"
                            name="master_datei_link"
                            value={formData.master_datei_link}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                            placeholder="Dropbox, Google Drive, etc."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        <Upload className="w-4 h-4 inline mr-2" />
                        Cover-Artwork
                      </label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            name="cover_file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormData(prev => ({ ...prev, cover_file: file }));
                              }
                            }}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="url"
                            name="cover_link"
                            value={formData.cover_link}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                            placeholder="Dropbox, Google Drive, etc."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        <Music className="w-4 h-4 inline mr-2" />
                        Spotify URI
                      </label>
                      <input
                        type="text"
                        name="spotify_uri"
                        value={formData.spotify_uri}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Die Spotify URI deines Releases (falls bereits verfügbar)
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Facebook Page URL
                      </label>
                      <input
                        type="url"
                        name="facebook_page_url"
                        value={formData.facebook_page_url}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                        placeholder="https://facebook.com/deinepage"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Damit wir Dir eine Anfrage für den Werbezugriff bei Instagram senden können.
                        <br />⚠️ Bitte teile niemals Login-Informationen (Passwörter, etc.) mit Dritten!
                      </p>
                    </div>


                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <DollarSign className="w-12 h-12 text-[#0000fe] mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Budget & Leistungen</h2>
                    <p className="text-white">Konfiguriere dein Kampagnen-Paket</p>
                  </div>

                  <div className="space-y-6">
                    {/* Fixed Ad Campaign Service */}
                    <div className="bg-[#0000fe]/10 border border-[#0000fe]/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled={true}
                            className="w-4 h-4 text-blue-600 bg-blue-600 border-blue-600 rounded opacity-100"
                          />
                          <label className="text-sm font-medium text-white">
                            <Target className="w-4 h-4 inline mr-2" />
                            Kampagnen-Management
                          </label>
                        </div>
                        <span className="text-[#0000fe] font-semibold">400€</span>
                      </div>
                      <p className="text-xs text-white ml-7 mt-1">
                        Kampagnen-Setup, Optimierung und Management inklusive
                      </p>
                    </div>

                    {/* Content Strategy Upsell - only show for repeat customers */}
                    {associatedArtists.length > 0 && (
                      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="content_strategy_upsell"
                              checked={formData.content_strategy_upsell}
                              onChange={(e) => handleCheckboxChange('content_strategy_upsell', e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-800 rounded focus:ring-[#0000fe]"
                            />
                            <label htmlFor="content_strategy_upsell" className="text-sm text-white">
                              <Target className="w-4 h-4 inline mr-2" />
                              Content-Strategie & Feedback
                            </label>
                          </div>
                          <span className="text-gray-400">+400€</span>
                        </div>
                        <p className="text-xs text-gray-400 ml-7 mt-1">
                          Entwicklung der Creative-Strategie und laufendes Feedback
                        </p>
                      </div>
                    )}

                    {/* Total Package Display */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-white">
                          Gesamt-Paket
                        </span>
                        <span className="text-xl font-bold text-green-400">
                          {400 + (formData.content_strategy_upsell ? 400 : 0)}€
                        </span>
                      </div>
                      <p className="text-xs text-white mt-1">
                        {formData.content_strategy_upsell 
                          ? 'Kampagnen-Management + Content-Strategie & Feedback' 
                          : 'Nur Kampagnen-Management'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <DollarSign className="w-4 h-4 inline mr-2" />
                        Werbebudget (netto, zusätzlich zu den Service-Gebühren) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="werbebudget_netto"
                          value={formData.werbebudget_netto}
                          onChange={handleInputChange}
                          min="650"
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2" style={{ '--tw-ring-color': '#0000fe' } as React.CSSProperties}
                          placeholder="650"
                          required
                        />
                        <span className="absolute right-3 top-3 text-gray-400">EUR</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Mindest-Werbebudget: 650€ netto (zusätzlich zu den Service-Gebühren oben)
                      </p>
                    </div>

                    
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mt-8">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="final_confirmation"
                          checked={formData.final_confirmation}
                          onChange={(e) => handleCheckboxChange('final_confirmation', e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-gray-900 border-gray-800 rounded focus:ring-[#0000fe] mt-1"
                          required
                        />
                        <label htmlFor="final_confirmation" className="text-sm text-white font-medium">
                          <strong>Kampagne verbindlich buchen</strong>
                          <p className="text-white mt-2 font-normal">
                            Ich bestätige hiermit die verbindliche Buchung meiner Kampagne mit den angegebenen Daten. 
                            Mir ist bewusst, dass nach der Buchung Änderungen nur noch eingeschränkt möglich sind.
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#0000fe' }}
                  >
                    Zurück
                  </button>
                )}
                
                <div className="ml-auto">
                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-6 py-3 text-white rounded-lg transition-colors font-medium hover:opacity-90"
                      style={{ backgroundColor: '#0000fe' }}
                    >
                      Weiter
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        isSubmitting
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'text-white hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: isSubmitting ? undefined : '#0000fe'
                      }}
                    >
                      {isSubmitting ? 'Wird gesendet...' : 'Bitte bestätige die Kampagnenbuchung'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCampaignSubmission;
