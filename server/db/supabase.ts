import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const cleanUrl = (url: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
};

const supabaseUrl = cleanUrl(rawUrl);
const supabaseKey = rawKey.trim();

export const isServerSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder') &&
    supabaseKey &&
    supabaseKey.length > 20 &&
    !supabaseKey.startsWith('http')
  );
};

export const supabaseServer: SupabaseClient | null = isServerSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Async dual-write helpers (non-blocking, fault-tolerant)

export async function syncLocationToSupabase(loc: any) {
  if (!supabaseServer) return;
  try {
    let facilities = loc.facilities;
    if (typeof facilities === 'string') {
      try {
        facilities = JSON.parse(facilities);
      } catch {
        facilities = [];
      }
    }
    await supabaseServer.from('locations').upsert({
      id: loc.id,
      name: loc.name,
      category: loc.category,
      description: loc.description || '',
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      building: loc.building || null,
      floor: loc.floor || null,
      facilities: facilities || [],
      opening_hours: loc.opening_hours || loc.openingHours || null,
      accessibility: loc.accessibility || null,
      image: loc.image || null,
      zone: loc.zone || null,
      contact_phone: loc.contact_phone || loc.contactPhone || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Error syncing location:', err);
  }
}

export async function deleteLocationFromSupabase(id: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('locations').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Error deleting location:', err);
  }
}

export async function syncEventToSupabase(ev: any) {
  if (!supabaseServer) return;
  try {
    let tags = ev.tags;
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = [];
      }
    }
    await supabaseServer.from('events').upsert({
      id: ev.id,
      title: ev.title,
      subtitle: ev.subtitle || null,
      description: ev.description || '',
      organizer: ev.organizer || 'VIT Bhopal',
      publisher_id: ev.publisher_id || ev.publisherId,
      location_id: ev.location_id || ev.locationId,
      location_name: ev.location_name || ev.locationName,
      venue_detail: ev.venue_detail || ev.venueDetail || null,
      date: ev.date,
      start_time: ev.start_time || ev.startTime,
      end_time: ev.end_time || ev.endTime,
      category: ev.category || 'Technical',
      verified: Boolean(ev.verified),
      cover_image: ev.cover_image || ev.coverImage || null,
      capacity: ev.capacity ? Number(ev.capacity) : null,
      registration_url: ev.registration_url || ev.registrationUrl || null,
      status: ev.status || 'upcoming',
      approval_status: ev.approval_status || ev.approvalStatus || 'approved',
      tags: tags || [],
      created_by: ev.created_by || ev.createdBy || null,
      version: ev.version ? Number(ev.version) : 1,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Error syncing event:', err);
  }
}

export async function deleteEventFromSupabase(id: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('events').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Error deleting event:', err);
  }
}

export async function syncAnnouncementToSupabase(ann: any) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('announcements').upsert({
      id: ann.id,
      title: ann.title,
      description: ann.description || '',
      publisher_id: ann.publisher_id || ann.publisherId,
      publisher_name: ann.publisher_name || ann.publisherName,
      location_id: ann.location_id || ann.locationId || null,
      location_name: ann.location_name || ann.locationName || null,
      category: ann.category || 'General',
      priority: ann.priority || 'medium',
      action_url: ann.action_url || ann.actionUrl || null,
      verified: Boolean(ann.verified),
      status: ann.status || (ann.verified ? 'approved' : 'pending'),
      author_role: ann.author_role || ann.authorRole || null,
      author_id: ann.author_id || ann.authorId || null,
      author_email: ann.author_email || ann.authorEmail || null,
      author_reg_number: ann.author_reg_number || ann.authorRegNumber || null,
      reviewed_by: ann.reviewed_by || ann.reviewedBy || null,
      reviewed_at: ann.reviewed_at || ann.reviewedAt || null,
      rejection_reason: ann.rejection_reason || ann.rejectionReason || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Error syncing announcement:', err);
  }
}

export async function deleteAnnouncementFromSupabase(id: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('announcements').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Error deleting announcement:', err);
  }
}

export async function syncFacultyToSupabase(f: any) {
  if (!supabaseServer) return;
  try {
    let subjects = f.subjects;
    if (typeof subjects === 'string') {
      try {
        subjects = JSON.parse(subjects);
      } catch {
        subjects = [];
      }
    }
    await supabaseServer.from('faculty').upsert({
      id: f.id,
      name: f.name,
      prefix: f.prefix || null,
      designation: f.designation,
      school: f.school,
      department_name: f.department_name || f.departmentName || '',
      cabin_number: f.cabin_number || f.cabinNumber,
      building_id: f.building_id || f.buildingId,
      building_name: f.building_name || f.buildingName,
      floor: f.floor,
      wing: f.wing || null,
      room_details: f.room_details || f.roomDetails || null,
      email: f.email,
      phone: f.phone || null,
      consultation_hours: f.consultation_hours || f.consultationHours || 'By Appointment',
      subjects: subjects || [],
      research_area: f.research_area || f.researchArea || null,
      directions_guide: f.directions_guide || f.directionsGuide || '',
      status: f.status || 'available',
      avatar_url: f.avatar_url || f.avatarUrl || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Error syncing faculty:', err);
  }
}

export async function deleteFacultyFromSupabase(id: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('faculty').delete().eq('id', id);
  } catch (err) {
    console.warn('[Supabase Sync] Error deleting faculty:', err);
  }
}

export async function syncPublisherToSupabase(p: any) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('publishers').upsert({
      id: p.id,
      user_id: p.user_id || p.userId || null,
      organization_name: p.organization_name || p.organizationName || p.name,
      category: p.category || 'Club',
      description: p.description || '',
      logo_url: p.logo_url || p.logoUrl || null,
      verified: Boolean(p.verified),
      contact_email: p.contact_email || p.contactEmail || '',
      verified_at: p.verified_at || p.verifiedAt || (p.verified ? new Date().toISOString() : null),
      department: p.department || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Error syncing publisher:', err);
  }
}

export async function logAuditToSupabase(logRecord: any) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('audit_logs').insert([
      {
        id: logRecord.id,
        user_id: logRecord.user_id,
        user_email: logRecord.user_email,
        user_role: logRecord.user_role,
        action: logRecord.action,
        resource_type: logRecord.resource_type,
        resource_id: logRecord.resource_id,
        details: typeof logRecord.details === 'string' ? JSON.parse(logRecord.details) : logRecord.details,
        ip_address: logRecord.ip_address,
        created_at: logRecord.created_at || new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('[Supabase Sync] Error logging audit record:', err);
  }
}

export async function syncSavedItemToSupabase(userId: string, itemType: string, itemId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from('saved_items').upsert({
      id: `saved_${userId}_${itemType}_${itemId}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
      saved_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Supabase Sync] Error syncing saved item:', err);
  }
}

export async function deleteSavedItemFromSupabase(userId: string, itemType: string, itemId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer
      .from('saved_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId);
  } catch (err) {
    console.warn('[Supabase Sync] Error deleting saved item:', err);
  }
}
