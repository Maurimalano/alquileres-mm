import { createClient } from './lib/supabase/client'

async function runQuery() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name')

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Tables:')
    data?.forEach(row => console.log(row.table_name))
  }
}

runQuery()