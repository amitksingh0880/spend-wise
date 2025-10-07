// import { generateUUIDFallback, uuidv4 } from '../../utils/uuid';

// export const testUUID = () => {
//   console.log('🧪 Testing UUID Generation...');
  
//   try {
//     // Test main UUID function
//     const uuid1 = uuidv4();
//     const uuid2 = uuidv4();
    
//     console.log(`✅ Generated UUID 1: ${uuid1}`);
//     console.log(`✅ Generated UUID 2: ${uuid2}`);
    
//     // Verify they are different
//     if (uuid1 !== uuid2) {
//       console.log('✅ UUIDs are unique');
//     } else {
//       console.log('❌ UUIDs are not unique');
//       return false;
//     }
    
//     // Test fallback function
//     const fallbackUuid = generateUUIDFallback();
//     console.log(`✅ Fallback UUID: ${fallbackUuid}`);
    
//     // Basic UUID format validation (8-4-4-4-12 pattern)
//     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
//     if (uuidRegex.test(uuid1) && uuidRegex.test(uuid2) && uuidRegex.test(fallbackUuid)) {
//       console.log('✅ All UUIDs match expected format');
//       console.log('🎉 UUID generation test passed!');
//       return true;
//     } else {
//       console.log('❌ UUID format validation failed');
//       return false;
//     }
    
//   } catch (error) {
//     console.error('❌ UUID test failed:', error);
//     return false;
//   }
// };

// export default testUUID;
