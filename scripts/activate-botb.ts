/**
 * One-time script to activate the BOTB site in Supabase.
 * Run: npx tsx scripts/activate-botb.ts
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createServiceClient } from '../src/lib/supabase';

async function main() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('sites')
    .update({
      active: true,
      has_affiliate: true,
      url: 'https://www.botb.com',
    })
    .eq('slug', 'botb')
    .select();

  if (error) {
    console.error('Error activating BOTB:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('No site found with slug "botb"');
    process.exit(1);
  }

  console.log('BOTB activated successfully:');
  console.log(JSON.stringify(data[0], null, 2));
}

main();
