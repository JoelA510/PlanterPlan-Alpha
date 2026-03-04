const fs = require('fs');

const schemaPath = 'docs/db/schema.sql';
let sql = fs.readFileSync(schemaPath, 'utf8');

// 1. Refactor RLS Policies
const rlsRegex = /CREATE POLICY [^;]+;/g;
sql = sql.replace(rlsRegex, (match) => {
    return match
        .replace(/\(\s*SELECT\s+"auth"\."uid"\(\)\s+AS\s+"uid"\s*\)/g, `(SELECT (auth.jwt() ->> 'sub')::uuid)`)
        .replace(/"auth"\."uid"\(\)/g, `(SELECT (auth.jwt() ->> 'sub')::uuid)`)
        .replace(/auth\.uid\(\)/g, `(SELECT (auth.jwt() ->> 'sub')::uuid)`);
});

// 2. Harden SECURITY DEFINER functions
// First, remove existing SET search_path TO 'public' inside SECURITY DEFINER contexts
sql = sql.replace(/(SECURITY DEFINER(?:\n.+?)?)SET\s+"search_path"\s+TO\s+'public'/g, '$1SET "search_path" TO \'\'');

// For those that are just SECURITY DEFINER without any SET following it:
// Let's do it simply by injecting SET search_path TO '' if it doesn't already have a SET clause.
const functionDefinitions = sql.split('CREATE OR REPLACE FUNCTION');
for (let i = 1; i < functionDefinitions.length; i++) {
    let func = functionDefinitions[i];
    if (func.includes('SECURITY DEFINER')) {
        if (!func.includes('SET "search_path" TO \'\'')) {
             if (func.includes('SET "search_path" TO \'public\'')) {
                 func = func.replace('SET "search_path" TO \'public\'', 'SET "search_path" TO \'\'');
             } else {
                 // Inject after SECURITY DEFINER
                 func = func.replace(/SECURITY DEFINER/, 'SECURITY DEFINER\n    SET "search_path" TO \'\'');
             }
        }
    }
    functionDefinitions[i] = func;
}
sql = functionDefinitions.join('CREATE OR REPLACE FUNCTION');

fs.writeFileSync(schemaPath, sql);
console.log('Schema refactoring complete.');
