const fs = require('fs');
const path = require('path');

// Function to fix toast calls in a file
function fixToastCalls(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix toast.success calls
  content = content.replace(
    /toast\.success\("([^"]+)"\)/g,
    'toast({\n          title: "Success",\n          description: "$1",\n        })'
  );

  // Fix toast.error calls
  content = content.replace(
    /toast\.error\("([^"]+)"\)/g,
    'toast({\n          title: "Error",\n          description: "$1",\n          variant: "destructive",\n        })'
  );

  // Fix toast.error calls with template literals
  content = content.replace(
    /toast\.error\(`([^`]+)`\)/g,
    'toast({\n          title: "Error",\n          description: `$1`,\n          variant: "destructive",\n        })'
  );

  // Fix toast.success calls with template literals
  content = content.replace(
    /toast\.success\(`([^`]+)`\)/g,
    'toast({\n          title: "Success",\n          description: `$1`,\n        })'
  );

  // Fix callback toast calls
  content = content.replace(
    /\(error\) => toast\.error\(error\)/g,
    '(error) => toast({\n          title: "Error",\n          description: error,\n          variant: "destructive",\n        })'
  );

  content = content.replace(
    /\(\) => toast\.success\("([^"]+)"\)/g,
    '() => toast({\n          title: "Success",\n          description: "$1",\n        })'
  );

  fs.writeFileSync(filePath, content);
  console.log(`Fixed toast calls in ${filePath}`);
}

// Fix the files
const files = [
  'src/pages/Manager/ViewSchedule.tsx',
  'src/pages/Manager/PrepareSchedule.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    fixToastCalls(file);
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Toast conversion complete!');
