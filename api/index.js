import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-me';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    console.log('=== Webhook Received ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Time:', new Date().toISOString());

    // ========== ROUTE 1: /api/ (Generic - Process & Return Data) ==========
    if (req.url === '/api/' || req.url === '/api') {
      console.log('\n=== ROUTE: Generic Webhook (Process & Return) ===');
      
      const { success, message, data } = req.body;
      
      if (!data || !data.kehadiranData) {
        console.error('❌ Missing kehadiranData');
        return res.status(400).json({
          success: false,
          error: 'MISSING_DATA',
          message: 'Request body harus contain data.kehadiranData'
        });
      }

      if (!Array.isArray(data.kehadiranData)) {
        console.error('❌ kehadiranData is not an array');
        return res.status(400).json({
          success: false,
          error: 'INVALID_FORMAT',
          message: 'data.kehadiranData must be an array'
        });
      }

      const kehadiranData = data.kehadiranData;
      console.log(`\n✅ Valid data received - Processing ${kehadiranData.length} records`);

      // ===== PROCESS DATA =====
      const processedData = [];
      const failedRecords = [];

      kehadiranData.forEach((record, index) => {
        try {
          // Validate required fields
          if (!record.sekolahNama || !record.sekolahId || record.totalHadir === undefined) {
            throw new Error('Missing required fields: sekolahNama, sekolahId, totalHadir');
          }

          console.log(`\n[${index + 1}] Processing: ${record.sekolahNama}`);
          console.log(`    - Hadir: ${record.totalHadir}/${record.totalSiswa || 'N/A'}`);
          console.log(`    - Persentase: ${record.persentase || 'N/A'}%`);

          // ===== PROCESS & TRANSFORM DATA =====
          const processed = {
            sekolahId: record.sekolahId,
            sekolahNama: record.sekolahNama,
            totalHadir: record.totalHadir,
            totalSiswa: record.totalSiswa || null,
            persentase: record.persentase || 0,
            tanggal: record.tanggal || new Date().toISOString().split('T')[0],
            // ===== ADD PROCESSING LOGIC =====
            status: record.totalHadir > 0 ? 'PRESENT' : 'ABSENT',
            attendance_rate: record.totalSiswa 
              ? Math.round((record.totalHadir / record.totalSiswa) * 100)
              : 0,
            processed_at: new Date().toISOString(),
            record_id: `${record.sekolahId}-${record.tanggal}-${Date.now()}`
          };

          processedData.push(processed);
          console.log(`    ✅ Processed successfully`);

        } catch (error) {
          console.error(`    ❌ Error: ${error.message}`);
          failedRecords.push({
            index: index + 1,
            sekolah: record.sekolahNama || 'Unknown',
            error: error.message
          });
        }
      });

      // ===== LOG SUMMARY =====
      console.log('\n--- Processing Summary ---');
      console.log(`✅ Success: ${processedData.length}`);
      console.log(`❌ Failed: ${failedRecords.length}`);
      console.log(`📊 Total: ${kehadiranData.length}`);

      // ===== RETURN PROCESSED DATA =====
      console.log('\n✅ Returning processed data to client');

      return res.status(200).json({
        success: true,
        message: 'Attendance data received and processed successfully',
        endpoint: '/api/',
        receivedAt: new Date().toISOString(),
        dataCount: kehadiranData.length,
        // ===== RETURN PROCESSED DATA BACK =====
        processed_data: processedData,
        summary: {
          total_records: kehadiranData.length,
          processed: processedData.length,
          failed: failedRecords.length,
          success_rate: `${Math.round((processedData.length / kehadiranData.length) * 100)}%`
        },
        errors: failedRecords.length > 0 ? failedRecords : null,
        // ===== CALCULATIONS =====
        statistics: {
          total_present: processedData.reduce((sum, r) => sum + r.totalHadir, 0),
          total_students: processedData.reduce((sum, r) => sum + (r.totalSiswa || 0), 0),
          average_attendance_rate: Math.round(
            processedData.reduce((sum, r) => sum + r.attendance_rate, 0) / (processedData.length || 1)
          )
        }
      });
    }

    // ========== ROUTE NOT FOUND ==========
    console.warn('⚠️ Route not recognized');
    return res.status(404).json({
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'Use /api/ endpoint to send attendance data',
      receivedUrl: req.url
    });

  } catch (error) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
}