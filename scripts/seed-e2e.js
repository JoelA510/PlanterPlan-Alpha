import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:54321', 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH');

async function seed() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123',
  });
  if (error) {
    if (error.message.includes('User already registered')) {
        console.log('User already exists');
    } else {
        console.error('Failed to seed user:', error);
        process.exit(1);
    }
  } else {
    console.log('Successfully seeded test@example.com');
  }
}

seed();
