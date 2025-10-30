// pages/api/index.js (atau pages/api/[[...slug]].js)
// File ini untuk menerima webhook dari PIC_DAPUR

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-and-long-key';

export default async function handler(req, res) {
  // ===== CORS HEADERS =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Dapur-ID, X-User-Data');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ===== ROUTE HANDLER =====
  if (req.url === '/api' || req.url === '/api/' || req.url === '/') {
    try {
      console.log('\n=== WEBHOOK RECEIVED ===');
      console.log('URL:', req.url);
      console.log('Method:', req.method);
      console.log('Time:', new Date().toISOString());

      // ===== HEALTH CHECK (GET) =====
      if (req.method === 'GET') {
        console.log('✅ Health check request');
        return res.status(200).json({
          success: true,
          message: 'Webhook receiver is active',
          timestamp: new Date().toISOString(),
          endpoint: req.url
        });
      }

      // ===== PROCESS DATA (POST) =====
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'METHOD_NOT_ALLOWED',
          message: `Method ${req.method} not allowed. Use GET or POST.`
        });
      }

      // ===== VALIDATE REQUEST BODY =====
      const body = req.body;

      if (!body) {
        console.error('❌ Empty request body');
        return res.status(400).json({
          success: false,
          error: 'EMPTY_BODY',
          message: 'Request body tidak boleh kosong'
        });
      }

      console.log('\n📥 Request Body Received:');
      console.log(JSON.stringify(body, null, 2));

      // ===== EXTRACT DATA =====
      // Support multiple format
      const data = body.data || body;
      const kehadiranData = data.kehadiranData || data.attendance || [];

      if (!Array.isArray(kehadiranData)) {
        console.error('❌ kehadiranData is not an array');
        return res.status(400).json({
          success: false,
          error: 'INVALID_FORMAT',
          message: 'data.kehadiranData harus berupa array',
          received_type: typeof kehadiranData,
          received_value: kehadiranData
        });
      }

      if (kehadiranData.length === 0) {
        console.warn('⚠️ Received empty array');
        return res.status(400).json({
          success: false,
          error: 'EMPTY_ARRAY',
          message: 'kehadiranData array tidak boleh kosong'
        });
      }

      console.log(`\n✅ Valid data - Processing ${kehadiranData.length} records`);

      // ===== PROCESS EACH RECORD =====
      const processedData = [];
      const failedRecords = [];

      kehadiranData.forEach((record, index) => {
        try {
          // Validate required fields
          const requiredFields = ['sekolahNama', 'sekolahId', 'totalHadir'];
          const missingFields = requiredFields.filter(field => 
            record[field] === undefined || record[field] === null
          );

          if (missingFields.length > 0) {
            throw new Error(`Missing fields: ${missingFields.join(', ')}`);
          }

          console.log(`\n[${index + 1}/${kehadiranData.length}] Processing: ${record.sekolahNama}`);
          console.log(`   └─ Hadir: ${record.totalHadir}/${record.totalSiswa || 'N/A'}`);

          // ===== CALCULATE STATISTICS =====
          const totalSiswa = record.totalSiswa || 0;
          const totalHadir = record.totalHadir || 0;
          const attendanceRate = totalSiswa > 0 
            ? Math.round((totalHadir / totalSiswa) * 100)
            : 0;

          // ===== CREATE PROCESSED RECORD =====
          const processed = {
            // Original data
            sekolahId: record.sekolahId,
            sekolahNama: record.sekolahNama,
            totalHadir: totalHadir,
            totalSiswa: totalSiswa,
            persentase: record.persentase || attendanceRate,
            tanggal: record.tanggal || new Date().toISOString().split('T')[0],

            // Calculated fields
            status: totalHadir > 0 ? 'PRESENT' : 'ABSENT',
            attendance_rate: attendanceRate,
            totalAbsen: totalSiswa - totalHadir,
            
            // Metadata
            processed_at: new Date().toISOString(),
            record_id: crypto
              .createHash('md5')
              .update(`${record.sekolahId}-${record.tanggal}-${totalHadir}`)
              .digest('hex')
          };

          processedData.push(processed);
          console.log(`   ✅ Success (Rate: ${attendanceRate}%)`);

        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
          failedRecords.push({
            index: index + 1,
            sekolah: record.sekolahNama || 'Unknown',
            error: error.message,
            data: record
          });
        }
      });

      // ===== CALCULATE SUMMARY =====
      const totalPresent = processedData.reduce((sum, r) => sum + r.totalHadir, 0);
      const totalStudents = processedData.reduce((sum, r) => sum + r.totalSiswa, 0);
      const avgAttendanceRate = processedData.length > 0
        ? Math.round(
            processedData.reduce((sum, r) => sum + r.attendance_rate, 0) / 
            processedData.length
          )
        : 0;

      console.log('\n--- PROCESSING SUMMARY ---');
      console.log(`✅ Success: ${processedData.length}/${kehadiranData.length}`);
      console.log(`❌ Failed: ${failedRecords.length}/${kehadiranData.length}`);
      console.log(`📊 Avg Attendance Rate: ${avgAttendanceRate}%`);
      console.log(`📊 Total Present: ${totalPresent}/${totalStudents}`);

      // ===== RETURN RESPONSE =====
      const response = {
        success: true,
        message: 'Attendance data received and processed successfully',
        endpoint: req.url,
        receivedAt: new Date().toISOString(),
        
        // Data summary
        summary: {
          total_records: kehadiranData.length,
          processed: processedData.length,
          failed: failedRecords.length,
          success_rate: `${Math.round((processedData.length / kehadiranData.length) * 100)}%`
        },

        // Processed data
        processed_data: processedData,

        // Statistics
        statistics: {
          total_present: totalPresent,
          total_students: totalStudents,
          total_absent: totalStudents - totalPresent,
          average_attendance_rate: avgAttendanceRate
        },

        // Errors (if any)
        ...(failedRecords.length > 0 && { errors: failedRecords })
      };

      console.log('\n✅ Sending response...');
      return res.status(200).json(response);

    } catch (error) {
      console.error('\n=== CRITICAL ERROR ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== ROUTE NOT FOUND =====
  console.warn('⚠️ Route not found:', req.url);
  return res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND',
    message: 'Use /api endpoint to send attendance data',
    receivedUrl: req.url,
    availableEndpoints: [
      'GET /api - Health check',
      'POST /api - Send attendance data'
    ]
  });
}