import { MongoClient } from 'mongodb';

const uri = 'mongodb://admin:Admin%407998@localhost:27017/admin';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('iwssdb');
    
    console.log('--- DEVICES ---');
    const devices = await db.collection('devices').find({}).toArray();
    console.log(JSON.stringify(devices, null, 2));
    
    console.log('\n--- LATEST DATA ---');
    const data = await db.collection('data').find({}).sort({ _ts: -1 }).limit(5).toArray();
    console.log(JSON.stringify(data, null, 2));

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
