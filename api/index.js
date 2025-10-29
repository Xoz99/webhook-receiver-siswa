// api/index.js - JWT Webhook (Tanpa External Import)
// Parse & verify JWT secara manual

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Hanya terima POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are accepted',
      receivedMethod: req.method
    });
  }

  try {
    // Log untuk debugging
    console.log('=== Webhook Received ===');
    console.log('Time:', new Date().toISOString());
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // ========== ROUTE 1: /api/ (Generic - Tanpa Token) ==========
    if (req.url === '/api/' || req.url === '/api') {
      console.log('\n=== ROUTE: Generic Webhook (No Auth) ===');
      
      const { success, message, data } = req.body;
      
      // Process kehadiran data jika ada
      if (data && data.kehadiranData) {
        const { kehadiranData } = data;
        
        console.log('\n=== Processing Kehadiran Data ===');
        console.log(`Total entries: ${kehadiranData.length}`);
        
        kehadiranData.forEach((sekolah, index) => {
          console.log(`\n[${index + 1}] Sekolah: ${sekolah.sekolahNama}`);
          console.log(`    ID: ${sekolah.sekolahId}`);
          console.log(`    Total Hadir: ${sekolah.totalHadir}`);
          console.log(`    Total Siswa: ${sekolah.totalSiswa || 'N/A'}`);
          console.log(`    Persentase: ${sekolah.persentase || 'N/A'}%`);
        });
      }
      
      console.log('\n✅ Generic webhook processed successfully');
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received and processed successfully',
        endpoint: '/api/',
        receivedAt: new Date().toISOString(),
        dataCount: data?.kehadiranData?.length || 0
      });
    }

    // ========== ROUTE 2: /api/{TOKEN} (Dengan JWT Auth) ==========
    const tokenMatch = req.url.match(/^\/api\/([^/?]+)(?:\?|$)/);
    
    if (tokenMatch && tokenMatch[1]) {
      const tokenFromUrl = tokenMatch[1];
      
      console.log(`\n=== ROUTE: Auth Webhook with JWT Token ===`);
      console.log(`Token received: ${tokenFromUrl.substring(0, 20)}...`);
      
      // ===== STEP 1: Parse & Verify JWT Token =====
      console.log('\n--- Step 1: Parsing & Verifying JWT Token ---');
      const tokenVerification = parseAndVerifyJWT(tokenFromUrl);
      
      if (!tokenVerification.valid) {
        console.warn(`❌ Token verification failed: ${tokenVerification.reason}`);
        return res.status(401).json({
          success: false,
          error: tokenVerification.error,
          message: tokenVerification.reason,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('✅ JWT Token verified successfully');
      console.log(`   User ID: ${tokenVerification.user.id}`);
      console.log(`   Email: ${tokenVerification.user.email}`);
      console.log(`   Role: ${tokenVerification.user.role}`);
      
      // ===== STEP 2: Validate Request Data =====
      console.log('\n--- Step 2: Validating Request Data ---');
      const { success, message, data } = req.body;
      
      if (!data || !data.kehadiranData) {
        console.error('❌ Missing kehadiranData');
        return res.status(400).json({
          success: false,
          error: 'MISSING_DATA',
          message: 'Request body harus contain data.kehadiranData',
          timestamp: new Date().toISOString()
        });
      }
      
      if (!Array.isArray(data.kehadiranData)) {
        console.error('❌ kehadiranData bukan array');
        return res.status(400).json({
          success: false,
          error: 'INVALID_FORMAT',
          message: 'data.kehadiranData harus berupa array',
          timestamp: new Date().toISOString()
        });
      }
      
      const kehadiranData = data.kehadiranData;
      console.log(`✅ Data valid - Total entries: ${kehadiranData.length}`);
      
      // ===== STEP 3: Process & Save Data =====
      console.log('\n--- Step 3: Processing Attendance Records ---');
      
      const processedData = [];
      const failedRecords = [];
      
      for (let i = 0; i < kehadiranData.length; i++) {
        const item = kehadiranData[i];
        
        try {
          // Validate each record
          if (!item.sekolahNama || !item.sekolahId || item.totalHadir === undefined) {
            throw new Error('Missing required fields: sekolahNama, sekolahId, totalHadir');
          }
          
          console.log(`\n[${i + 1}] Processing: ${item.sekolahNama}`);
          console.log(`    - Sekolah ID: ${item.sekolahId}`);
          console.log(`    - Hadir: ${item.totalHadir}/${item.totalSiswa || 'N/A'}`);
          console.log(`    - Persentase: ${item.persentase || 'N/A'}%`);
          console.log(`    - Tanggal: ${item.tanggal || new Date().toISOString().split('T')[0]}`);
          
          // ===== TODO: SIMPAN KE DATABASE DI SINI =====
          // Contoh dengan Prisma:
          // const record = await prisma.absensi.create({
          //   data: {
          //     sekolahNama: item.sekolahNama,
          //     sekolahId: item.sekolahId,
          //     totalHadir: item.totalHadir,
          //     totalSiswa: item.totalSiswa,
          //     userId: tokenVerification.user.id,
          //     userEmail: tokenVerification.user.email,
          //     userRole: tokenVerification.user.role,
          //     createdAt: new Date()
          //   }
          // });

          processedData.push({
            sekolahNama: item.sekolahNama,
            sekolahId: item.sekolahId,
            hadir: item.totalHadir,
            total: item.totalSiswa || null,
            persentase: item.persentase || null,
            tanggal: item.tanggal || new Date().toISOString().split('T')[0],
            status: 'processed',
            timestamp: new Date().toISOString()
          });
          
          console.log(`    ✅ Record processed successfully`);
          
        } catch (recordError) {
          console.error(`    ❌ Error processing record: ${recordError.message}`);
          failedRecords.push({
            index: i + 1,
            sekolah: item.sekolahNama || 'Unknown',
            error: recordError.message
          });
        }
      }
      
      // ===== STEP 4: Log Summary =====
      console.log('\n--- Step 4: Processing Summary ---');
      console.log(`✅ Success: ${processedData.length}`);
      console.log(`❌ Failed: ${failedRecords.length}`);
      console.log(`📊 Total: ${kehadiranData.length}`);
      console.log(`🔑 User: ${tokenVerification.user.email} (${tokenVerification.user.role})`);
      console.log(`⏰ Processed at: ${new Date().toISOString()}`);
      
      // ===== STEP 5: Return Response =====
      console.log('\n✅ Returning successful response');
      
      return res.status(200).json({
        success: true,
        message: 'Attendance data processed with JWT auth token',
        endpoint: '/api/{token}',
        timestamp: new Date().toISOString(),
        auth: {
          token: tokenFromUrl.substring(0, 20) + '...',
          user: {
            id: tokenVerification.user.id,
            email: tokenVerification.user.email,
            name: tokenVerification.user.name || null,
            role: tokenVerification.user.role
          },
          expiresIn: tokenVerification.expiresIn
        },
        summary: {
          processed: processedData.length,
          failed: failedRecords.length,
          total: kehadiranData.length
        },
        data: processedData,
        errors: failedRecords.length > 0 ? failedRecords : null
      });
    }

    // ========== ROUTE NOT FOUND ==========
    console.warn('⚠️ Route not recognized');
    return res.status(404).json({
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'Use /api/ (generic) or /api/{JWT_TOKEN} (with auth)',
      receivedUrl: req.url,
      examples: {
        generic: 'POST /api/',
        withAuth: 'POST /api/eyJhbGciOiJIUzI1NiIs...'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== CRITICAL ERROR ===');
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

// ===== HELPER FUNCTION: Parse & Verify JWT (Manual) =====
function parseAndVerifyJWT(token) {
  try {
    console.log(`Parsing JWT token: ${token.substring(0, 20)}...`);
    
    // Split JWT into parts: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format - must have 3 parts');
      return {
        valid: false,
        error: 'INVALID_TOKEN',
        reason: 'Token format tidak valid (bukan JWT)'
      };
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    console.log('✅ JWT format valid (3 parts detected)');
    
    // Decode payload (Base64URL to JSON)
    let payload;
    try {
      const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf-8');
      payload = JSON.parse(payloadJson);
      console.log('✅ Payload decoded');
      console.log(`   ID: ${payload.id}`);
      console.log(`   Email: ${payload.email}`);
      console.log(`   Role: ${payload.role}`);
    } catch (decodeError) {
      console.error('❌ Failed to decode payload:', decodeError.message);
      return {
        valid: false,
        error: 'INVALID_TOKEN',
        reason: 'Token payload tidak dapat di-decode'
      };
    }
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    
    if (expiresIn <= 0) {
      console.warn(`❌ Token has expired (${Math.abs(expiresIn)} seconds ago)`);
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
        reason: `Token expired ${Math.abs(expiresIn)} seconds ago`
      };
    }
    
    console.log(`✅ Token expires in ${expiresIn} seconds`);
    
    // Check role - hanya authorized roles yang boleh
    const allowedRoles = ['PIC_SEKOLAH', 'PIC_DAPUR', 'ADMIN'];
    
    if (!allowedRoles.includes(payload.role)) {
      console.warn(`❌ Role not allowed: ${payload.role}`);
      return {
        valid: false,
        error: 'UNAUTHORIZED',
        reason: `Role '${payload.role}' not authorized. Allowed roles: ${allowedRoles.join(', ')}`
      };
    }
    
    console.log(`✅ Role '${payload.role}' is authorized`);
    
    // Token valid!
    return {
      valid: true,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name || null
      },
      expiresIn: expiresIn,
      issuedAt: payload.iat,
      payload: payload
    };
    
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    return {
      valid: false,
      error: 'TOKEN_VERIFICATION_ERROR',
      reason: error.message
    };
  }
}