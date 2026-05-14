/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-nocheck
const fs = require('fs');
const { join } = require('path');

const downloadOPENAPISpecFile = (url, folderPath) => {
  const protocol = url.startsWith('https') ? require('https') : require('http');

  protocol.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      const fileContent = `export default ${data} as const;`;

      fs.mkdirSync(join(folderPath), { recursive: true });

      fs.writeFile(join(folderPath, 'spec.ts'), fileContent, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log(`File generated at ${join(folderPath, 'spec.ts')} !`);
        }
      });
    });
  });
};

const url = process.env.OPENAPI_JSON_URL;
const folderPath = join(__dirname, '../src/services/api/generated');

console.log(`Downloading OpenAPI spec... (${url})`);
downloadOPENAPISpecFile(url, folderPath);
