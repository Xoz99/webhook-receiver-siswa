// api/webhooks.js
export default async function handler(req, res) {
  // CORS headers (untuk debugging dan compatibility)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { success, message, data } = req.body;
    
    // Process kehadiran data jika ada
    if (data && data.kehadiranData) {
      const { kehadiranData } = data;
      
      console.log('\n=== Processing Kehadiran Data ===');
      kehadiranData.forEach((sekolah, index) => {
        console.log(`\n[${index + 1}] Sekolah: ${sekolah.sekolahNama}`);
        console.log(`    ID: ${sekolah.sekolahId}`);
        console.log(`    Total Hadir: ${sekolah.totalHadir}`);
      });
      
      // TODO: Di sini bisa tambahkan logic:
      // - Simpan ke database
      // - Kirim notifikasi
      // - Update dashboard real-time
      // - Trigger other webhooks
    }
    
    // Response sukses ke backend
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed successfully',
      receivedAt: new Date().toISOString(),
      dataCount: data?.kehadiranData?.length || 0
    });
    
  } catch (error) {
    console.error('=== Error Processing Webhook ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
}
