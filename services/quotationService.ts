import { supabase } from '../lib/supabaseClient';
import { QuotationData } from '../types';

export const saveQuotation = async (quotation: QuotationData, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .upsert({
        id: quotation.id || undefined,
        user_id: userId,
        client_name: quotation.clientDetails.clientName,
        client_email: quotation.clientDetails.clientEmail,
        client_address: quotation.clientDetails.clientAddress,
        client_phone: quotation.clientDetails.clientPhone,
        project_name: quotation.clientDetails.projectName,
        quotation_data: quotation,
        status: quotation.status || 'Pending',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving quotation:', error);
    throw error;
  }
};

export const fetchUserQuotations = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return [];
  }
};

export const getQuotationById = async (quotationId: string) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching quotation:', error);
    return null;
  }
};

export const deleteQuotation = async (quotationId: string) => {
  try {
    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', quotationId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting quotation:', error);
    throw error;
  }
};

export const updateQuotationStatus = async (quotationId: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', quotationId);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating quotation status:', error);
    throw error;
  }
};
