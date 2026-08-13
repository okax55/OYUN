import { createClient } from '@supabase/supabase-js';

// Bu değerler .env dosyasından çekilecek.
// Kullanıcı Supabase kurana kadar hata vermemesi için fallback ekliyoruz.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export interface ScoreEntry {
  id: string; // deviceId
  nickname: string;
  score: number;
  timestamp: number;
}

// Cihaz Kimliği (Device ID) Oluşturma / Alma
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('dropMergeDeviceId');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('dropMergeDeviceId', deviceId);
  }
  return deviceId;
};

// Global Skor Kaydetme
export const saveGlobalScore = async (nickname: string, score: number): Promise<void> => {
  const deviceId = getDeviceId();
  
  if (supabase) {
    try {
      // İsim üzerinden kontrol edelim ki aynı isim 2 kere listelenmesin
      const { data: existingData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('nickname', nickname)
        .limit(1);

      if (existingData && existingData.length > 0) {
        const existing = existingData[0];
        // Sadece yeni skor daha yüksekse güncelle
        if (score > existing.score) {
          const { error } = await supabase
            .from('leaderboard')
            .update({ score, updated_at: new Date().toISOString() })
            .eq('nickname', nickname);
            
          if (error) console.error("Supabase update error:", error);
        }
      } else {
        // İsim yoksa yeni kayıt ekle
        const { error } = await supabase
          .from('leaderboard')
          .insert({ 
            id: deviceId, 
            nickname, 
            score, 
            updated_at: new Date().toISOString()
          });
          
        if (error) console.error("Supabase insert error:", error);
      }
    } catch (e) {
      console.error("Failed to save to Supabase", e);
    }
  } else {
    // Fallback: LocalStorage Mock Leaderboard
    const localDb = JSON.parse(localStorage.getItem('mockLeaderboard') || '[]');
    // Cihaz yerine isme göre kontrol edelim
    const existing = localDb.find((entry: any) => entry.nickname === nickname);
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.timestamp = Date.now();
      }
    } else {
      localDb.push({ id: deviceId, nickname, score, timestamp: Date.now() });
    }
    localStorage.setItem('mockLeaderboard', JSON.stringify(localDb));
  }
};

// Global Top 5 Çekme
export const getTopScores = async (): Promise<ScoreEntry[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      return data as ScoreEntry[];
    } catch (e) {
      console.error("Failed to fetch from Supabase", e);
      return [];
    }
  } else {
    // Fallback: LocalStorage Mock Leaderboard
    const localDb = JSON.parse(localStorage.getItem('mockLeaderboard') || '[]');
    localDb.sort((a: any, b: any) => b.score - a.score);
    return localDb.slice(0, 5);
  }
};

// Kullanıcının En İyi Skorunu Çekme (Güncellemelerde Kaybolmasın Diye)
export const getUserBestScore = async (nickname: string): Promise<number> => {
  const deviceId = getDeviceId();
  let best = 0;

  if (supabase) {
    try {
      if (nickname) {
        const { data } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('nickname', nickname)
          .limit(1);
        if (data && data.length > 0) best = Math.max(best, data[0].score);
      }
      
      const { data: deviceData } = await supabase
        .from('leaderboard')
        .select('score')
        .eq('id', deviceId)
        .limit(1);
        
      if (deviceData && deviceData.length > 0) best = Math.max(best, deviceData[0].score);
    } catch (e) {
      console.error(e);
    }
  } else {
    const localDb = JSON.parse(localStorage.getItem('mockLeaderboard') || '[]');
    if (nickname) {
      const byName = localDb.find((e: any) => e.nickname === nickname);
      if (byName) best = Math.max(best, byName.score);
    }
    const byId = localDb.find((e: any) => e.id === deviceId);
    if (byId) best = Math.max(best, byId.score);
  }
  
  return best;
};
