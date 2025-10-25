const ts = require('typescript');

module.exports = {
  process(src, filename) {
    // Replace import.meta.env.VITE_* with process.env.VITE_* for Jest
    let transformedCode = src.replace(
      /import\.meta\.env\.VITE_(\w+)/g,
      'process.env.VITE_$1'
    );
    
    // Also handle import.meta.env without VITE_ prefix
    transformedCode = transformedCode.replace(
      /import\.meta\.env\.(\w+)/g,
      'process.env.$1'
    );
    
    // Handle import.meta.env without any property
    transformedCode = transformedCode.replace(
      /import\.meta\.env/g,
      'process.env'
    );
    
    // Handle dynamic imports that cause vm modules issues
    transformedCode = transformedCode.replace(
      /new\s+QrScanner\(/g,
      'new (global.QrScanner || QrScanner)('
    );
    
    // Compile TypeScript to JavaScript
    try {
      const result = ts.transpileModule(transformedCode, {
        compilerOptions: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          target: 'es2015',
          module: 'commonjs'
        }
      });
      
      // Return object with code property as required by Jest 28+
      return {
        code: result.outputText
      };
    } catch (error) {
      // If transpilation fails, return original code
      return {
        code: transformedCode
      };
    }
  },
};