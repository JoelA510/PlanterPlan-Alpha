const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const testUserPassword = process.env.TEST_USER_PASSWORD;

if (!supabaseUrl || !supabaseKey || !testUserPassword) {
  console.error(
    'Missing env vars! Ensure REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY, and TEST_USER_PASSWORD are set.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl);

  // 1. Test Simple Query (Public/Anon check)
  // We try to fetch 1 task. Even if 403, it proves connection.
  // If connection fails (ENOTFOUND), it's network/project paused.
  console.log('\n--- 1. Network / Query Test ---');
  const { data, error, status } = await supabase
    .from('tasks')
    .select('count', { count: 'exact', head: true });
  console.log('Query Status:', status);
  if (error) {
    console.log('Query Error:', error.message);
  } else {
    console.log('Query Success (Anon)');
  }

  // 2. Test Auth (Sign Up)
  console.log('\n--- 2. Auth Test (Sign Up) ---');
  const email = `test_script_${Math.floor(Math.random() * 10000)}@example.com`;
  console.log('Attempting sign up with:', email);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: testUserPassword,
  });

  if (authError) {
    console.error('Sign Up FAILED:', authError.status, authError.message);
    // Print full error object to debug "Anonymous" weirdness
    console.error('Full Error:', JSON.stringify(authError, null, 2));
  } else {
    console.log('Sign Up SUCCESS. User ID:', authData.user?.id);
  }
}

testConnection();
