/**
 * Quick script to check KeywordFrequency collection in MongoDB
 * Run with: node src/scripts/checkKeywords.js
 */

import mongoose from 'mongoose';
import KeywordFrequency from '../models/KeywordFrequency.js';
import 'dotenv/config';

async function checkKeywordDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Count total documents
    const count = await KeywordFrequency.countDocuments();
    console.log(`📊 Total keyword entries in database: ${count}\n`);
    
    if (count > 0) {
      console.log('📋 Recent keyword entries:');
      console.log('─'.repeat(80));
      
      // Get most recent 10 entries
      const recent = await KeywordFrequency.find()
        .sort({ lastChecked: -1 })
        .limit(10);
      
      recent.forEach((entry, index) => {
        console.log(`\n${index + 1}. Keywords: "${entry.keywords}"`);
        console.log(`   Search Count: ${entry.searchCount.toLocaleString()}`);
        console.log(`   Source: ${entry.source}`);
        console.log(`   Last Checked: ${entry.lastChecked.toLocaleString()}`);
        console.log(`   Age: ${Math.round((Date.now() - entry.lastChecked) / 1000 / 60)} minutes ago`);
        
        const score = entry.getUniquenessScore();
        console.log(`   Score: ${score.score}/10 (${score.level})`);
        console.log(`   Reasoning: ${score.reasoning}`);
      });
      
      console.log('\n' + '─'.repeat(80));
    } else {
      console.log('⚠️  No keyword data found in database yet.');
      console.log('💡 Data will be stored when you analyze a blog URL with ?fast=false');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkKeywordDatabase();
