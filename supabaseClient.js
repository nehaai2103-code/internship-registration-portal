import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wydvkbznrgjykdltyjtz.supabase.co'

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZHZrYnpucmdqeWtkbHR5anR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgyNDM5MSwiZXhwIjoyMDk0NDAwMzkxfQ.AZNMfLDdKUE1gg-5U7DrQRH8I5qvr6lwTexXwxXhlgs';


const supabase = createClient(supabaseUrl, supabaseKey)

async function insertData() {

  const { data, error } = await supabase
    .from('students')
    .insert([
      {
        name: 'Neha',
        email: 'nehaai2103@gmail.com'
      }
    ])

  if (error) {
    console.log(error)
  } else {
    console.log("Data Inserted")
  }
}

insertData()