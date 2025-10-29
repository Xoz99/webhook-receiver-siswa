// api/index.js - FULL CODE dengan JWT Verification
import jwt from 'jsonwebtoken';

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
        
        // TODO: Di sini bisa tambahkan logic:
        // - Simpan ke database
        // - Kirim notifikasi
        // - Update dashboard real-time
        // - Trigger other webhooks
      }
      
      // Response sukses ke backend
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
    // Extract token dari URL: /api/TOKEN_VALUE
    const tokenMatch = req.url.match(/^\/api\/([^/?]+)(?:\?|$)/);
    
    if (tokenMatch && tokenMatch[1]) {
      const tokenFromUrl = tokenMatch[1];
      
      console.log(`\n=== ROUTE: Auth Webhook with JWT Token ===`);
      console.log(`Token received: ${tokenFromUrl.substring(0, 20)}...`);
      
      // ===== STEP 1: Verify JWT Token =====
      console.log('\n--- Step 1: Verifying JWT Token ---');
      const tokenVerification = await verifyJWTToken(tokenFromUrl);
      
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
          //     persentase: item.persentase,
          //     tanggal: item.tanggal || new Date(),
          //     userId: tokenVerification.user.id,
          //     userEmail: tokenVerification.user.email,
          //     userRole: tokenVerification.user.role,
          //     token: tokenFromUrl.substring(0, 50),
          //     status: 'success',
          //     createdAt: new Date()
          //   }
          // });

          // Contoh dengan MongoDB:
          // await db.collection('absensi').insertOne({
          //   sekolahNama: item.sekolahNama,
          //   sekolahId: item.sekolahId,
          //   totalHadir: item.totalHadir,
          //   totalSiswa: item.totalSiswa,
          //   persentase: item.persentase,
          //   tanggal: item.tanggal || new Date(),
          //   userId: tokenVerification.user.id,
          //   userEmail: tokenVerification.user.email,
          //   userRole: tokenVerification.user.role,
          //   createdAt: new Date()
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

// ===== HELPER FUNCTION: Verify JWT Token =====
async function verifyJWTToken(token) {
  try {
    console.log(`Verifying JWT token: ${token.substring(0, 20)}...`);
    
    // Get JWT secret dari environment variable
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured in environment');
      return {
        valid: false,
        error: 'SERVER_ERROR',
        reason: 'JWT_SECRET not configured'
      };
    }
    
    console.log('JWT_SECRET found in environment');
    
    // Verify JWT signature
    const decoded = jwt.verify(token, jwtSecret);
    
    console.log('✅ JWT signature verified');
    console.log(`   Token ID: ${decoded.id}`);
    console.log(`   Token Email: ${decoded.email}`);
    console.log(`   Token Role: ${decoded.role}`);
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded.exp - now;
    
    if (expiresIn <= 0) {
      console.warn('❌ Token has expired');
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
        reason: `Token expired ${Math.abs(expiresIn)} seconds ago`
      };
    }
    
    console.log(`✅ Token expires in ${expiresIn} seconds`);
    
    // Check role - hanya authorized roles yang boleh
    const allowedRoles = ['PIC_SEKOLAH', 'PIC_DAPUR', 'ADMIN'];
    
    if (!allowedRoles.includes(decoded.role)) {
      console.warn(`❌ Role not allowed: ${decoded.role}`);
      return {
        valid: false,
        error: 'UNAUTHORIZED',
        reason: `Role '${decoded.role}' not authorized. Allowed roles: ${allowedRoles.join(', ')}`
      };
    }
    
    console.log(`✅ Role '${decoded.role}' is authorized`);
    
    // Token valid!
    return {
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name || null
      },
      expiresIn: expiresIn,
      issuedAt: decoded.iat
    };
    
  } catch (jwtError) {
    console.error('❌ JWT verification failed');
    
    if (jwtError.name === 'TokenExpiredError') {
      console.error(`   Reason: Token expired at ${new Date(jwtError.expiredAt).toISOString()}`);
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
        reason: 'Token sudah expired'
      };
    } else if (jwtError.name === 'JsonWebTokenError') {
      console.error(`   Reason: Invalid token - ${jwtError.message}`);
      return {
        valid: false,
        error: 'INVALID_TOKEN',
        reason: 'Token tidak valid atau corrupted'
      };
    } else if (jwtError.name === 'NotBeforeError') {
      console.error('   Reason: Token not yet valid');
      return {
        valid: false,
        error: 'TOKEN_NOT_YET_VALID',
        reason: 'Token belum berlaku'
      };
    } else {
      console.error(`   Reason: ${jwtError.message}`);
      return {
        valid: false,
        error: 'TOKEN_VERIFICATION_ERROR',
        reason: jwtError.message
      };
    }
  }
}

// ===== HELPER FUNCTION: Verify Token via API (Alternative) =====
// Gunakan ini jika mau verify via backend auth API
async function verifyTokenViaAPI(token) {
  try {
    console.log('Verifying token via API...');
    
    const authApiUrl = process.env.AUTH_API_URL;
    
    if (!authApiUrl) {
      console.error('AUTH_API_URL not configured');
      return {
        valid: false,
        error: 'SERVER_ERROR',
        reason: 'AUTH_API_URL not configured'
      };
    }
    
    const response = await fetch(`${authApiUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      console.error(`Auth API returned ${response.status}`);
      return {
        valid: false,
        error: 'AUTH_FAILED',
        reason: 'Token verification failed via API'
      };
    }
    
    const data = await response.json();
    
    if (!data.valid) {
      console.warn('Auth API says token is invalid');
      return {
        valid: false,
        error: 'INVALID_TOKEN',
        reason: data.reason || 'Token tidak valid'
      };
    }
    
    console.log('✅ Token verified via API');
    return {
      valid: true,
      user: data.user,
      expiresIn: data.expiresIn
    };
    
  } catch (error) {
    console.error('Auth API error:', error.message);
    return {
      valid: false,
      error: 'AUTH_API_ERROR',
      reason: error.message
    };
  }
}