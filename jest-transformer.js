const { createRequire } = require('module');

module.exports = {
  process(src, filename) {
    // Transform import.meta.env usage for Jest
    const transformedCode = src
      .replace(/import\.meta\.env\./g, 'process.env')
      .replace(/import\.meta/g, 'undefined');
    
    return {
      code: transformedCode
    };
  },
};