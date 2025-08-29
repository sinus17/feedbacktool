import { supabase } from '../lib/supabase';

export async function removeSpecificAdCreative() {
  try {
    const targetUrl = 'https://wrlgoxbzlngdtomjhvnz.supabase.co/storage/v1/object/public/videos/uploads/1751084350459_my3gvnfoud.mov';
    
    // Find and delete the ad creative with this specific URL
    const { data, error } = await supabase
      .from('ad_creatives')
      .delete()
      .eq('content', targetUrl)
      .select();

    if (error) {
      console.error('Error removing ad creative:', error);
      return { success: false, error: error.message };
    }

    console.log('Successfully removed ad creative:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in removeSpecificAdCreative:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}