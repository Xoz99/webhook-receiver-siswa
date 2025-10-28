// api/webhooks.js
// COMBINED VERSION - Support untuk /api/webhooks dan /api/kelas/[id]/absensi

export default async function handler(req, res) {
  // CORS headers (untuk debugging dan compatibility)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Hanya terima POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      message: 'Only POST requests are accepted',
      receivedMethod: req.method
    });
  }

  try {
    // Log untuk debugging
    console.log('=== Webhook Received ===');
    console.log('Time:', new Date().toISOString());
    console.log('URL:', req.url);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { success, message, data } = req.body;
    
    // ========== ROUTE 1: /api/webhooks (Generic webhook) ==========
    if (req.url === '/api/webhooks' || req.url.startsWith('/api/webhooks?')) {
      console.log('\n=== Processing Generic Webhook ===');
      
      if (data && data.kehadiranData) {
        const { kehadiranData } = data;
        
        console.log('\n=== Processing Kehadiran Data ===');
        kehadiranData.forEach((sekolah, index) => {
          console.log(`\n[${index + 1}] Sekolah: ${sekolah.sekolahNama}`);
          console.log(`    ID: ${sekolah.sekolahId}`);
          console.log(`    Total Hadir: ${sekolah.totalHadir}`);
        });
      }
      
      // Response sukses ke backend
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received and processed successfully',
        endpoint: '/api/webhooks',
        receivedAt: new Date().toISOString(),
        dataCount: data?.kehadiranData?.length || 0
      });
    }

    // ========== ROUTE 2: /api/kelas/[id]/absensi (Dynamic route) ==========
    // Ekstrak kelas ID dari URL - format: /api/kelas/60699c4a-56c3-462f-a31a-d282487c31e2/absensi
    const kelasIdMatch = req.url.match(/\/api\/kelas\/([^\/]+)\/absensi/);
    
    if (kelasIdMatch && kelasIdMatch[1]) {
      const kelasId = kelasIdMatch[1];
      console.log(`\n=== Processing Kelas-Specific Webhook ===`);
      console.log(`Kelas ID: ${kelasId}`);
      
      // Validasi kelasId
      if (!kelasId || kelasId.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing kelas ID',
          message: 'Kelas ID is required in URL parameter'
        });
      }

      // Validasi data
      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Missing data',
          message: 'Request body must contain data field',
          kelasId: kelasId
        });
      }

      // Process kehadiran data
      if (data && data.kehadiranData) {
        const { kehadiranData } = data;
        
        console.log(`\n=== Processing Kehadiran Data for Kelas ${kelasId} ===`);
        console.log(`Total entries: ${kehadiranData.length}`);
        
        kehadiranData.forEach((sekolah, index) => {
          console.log(`\n[${index + 1}] Sekolah: ${sekolah.sekolahNama}`);
          console.log(`    Sekolah ID: ${sekolah.sekolahId}`);
          console.log(`    Total Hadir: ${sekolah.totalHadir}`);
          console.log(`    Total Siswa: ${sekolah.totalSiswa || 'N/A'}`);
          console.log(`    Persentase: ${sekolah.persentase || 'N/A'}%`);
        });

        // TODO: Di sini bisa tambahkan logic:
        // - Simpan ke database dengan kelasId
        // - Kirim notifikasi ke kelas tertentu
        // - Update dashboard kelas real-time
        // - Trigger other webhooks khusus kelas ini
      }

      // Response sukses untuk kelas-specific webhook
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received and processed successfully',
        endpoint: '/api/kelas/[id]/absensi',
        kelasId: kelasId,
        receivedAt: new Date().toISOString(),
        dataCount: data?.kehadiranData?.length || 0,
        status: 'processed'
      });
    }

    // ========== ROUTE NOT FOUND ==========
    // Jika URL tidak match pattern manapun
    return res.status(404).json({
      success: false,
      error: 'Route Not Found',
      message: 'Endpoint not recognized. Use /api/webhooks or /api/kelas/[id]/absensi',
      receivedUrl: req.url
    });
    
  } catch (error) {
    console.error('=== Error Processing Webhook ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
