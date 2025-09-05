// Test script for OpenAI GPT-5 API
// Using built-in fetch (Node 18+)

async function testGPT5API() {
  console.log('🔍 Testing OpenAI GPT-5 API...\n');
  
  // Try to get API key from environment or prompt user to add it
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: No OpenAI API key found.');
    console.log('Please set OPENAI_API_KEY environment variable or add it in the app Settings.');
    console.log('Example: OPENAI_API_KEY=sk-... node test-gpt5.js');
    return;
  }

  console.log('✅ API key found (masked):', apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4));
  
  // Test endpoint 1: List available models
  console.log('\n📋 Step 1: Checking available models...');
  try {
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      const gpt5Models = models.data.filter(m => m.id.includes('gpt-5'));
      
      if (gpt5Models.length > 0) {
        console.log('✅ GPT-5 models found:');
        gpt5Models.forEach(model => {
          console.log(`   - ${model.id} (created: ${new Date(model.created * 1000).toLocaleDateString()})`);
        });
      } else {
        console.log('⚠️  No GPT-5 models found in the list. Available GPT models:');
        const gptModels = models.data.filter(m => m.id.includes('gpt')).slice(0, 10);
        gptModels.forEach(model => {
          console.log(`   - ${model.id}`);
        });
      }
    } else {
      const errorText = await modelsResponse.text();
      console.error('❌ Failed to fetch models:', modelsResponse.status, errorText.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Error fetching models:', error.message);
  }

  // Test endpoint 2: Make a completion request with GPT-5
  console.log('\n🤖 Step 2: Testing GPT-5 chat completion...');
  try {
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with your model name and version.'
          },
          {
            role: 'user',
            content: 'What AI model are you? Please include your exact model ID and capabilities.'
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      }),
    });

    if (chatResponse.ok) {
      const result = await chatResponse.json();
      console.log('✅ GPT-5 Response received successfully!');
      console.log('   Model used:', result.model);
      console.log('   Response:', result.choices[0].message.content);
      console.log('   Tokens used:', result.usage.total_tokens);
      console.log('\n🎉 GPT-5 API is working correctly!');
    } else {
      const errorData = await chatResponse.text();
      let errorParsed;
      try {
        errorParsed = JSON.parse(errorData);
      } catch {
        errorParsed = { message: errorData };
      }
      
      console.error('❌ GPT-5 request failed:', chatResponse.status);
      console.error('   Error:', errorParsed.error?.message || errorParsed.message);
      
      if (errorParsed.error?.code === 'model_not_found') {
        console.log('\n⚠️  The model "gpt-5" was not found.');
        console.log('This might mean:');
        console.log('  1. GPT-5 is not yet available on your account');
        console.log('  2. You need to use a different model ID (e.g., gpt-5-mini, gpt-5-nano)');
        console.log('  3. Your API key doesn\'t have access to GPT-5 yet');
        
        // Try alternative GPT-5 models
        console.log('\n🔄 Trying alternative GPT-5 model IDs...');
        const alternativeModels = ['gpt-5-mini', 'gpt-5-nano', 'gpt-5-turbo'];
        
        for (const modelId of alternativeModels) {
          console.log(`\n   Testing ${modelId}...`);
          const altResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Test' }],
              max_tokens: 10,
            }),
          });
          
          if (altResponse.ok) {
            const altResult = await altResponse.json();
            console.log(`   ✅ ${modelId} works! Model responded:`, altResult.model);
            break;
          } else {
            console.log(`   ❌ ${modelId} not available`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error testing GPT-5:', error.message);
  }

  console.log('\n📊 Test complete!');
  console.log('=====================================\n');
}

// Run the test
testGPT5API();