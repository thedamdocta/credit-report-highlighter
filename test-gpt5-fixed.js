// Test script for OpenAI GPT-5 API with correct parameters
async function testGPT5API() {
  console.log('🔍 Testing OpenAI GPT-5 API (Fixed)...\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: No OpenAI API key found.');
    return;
  }

  console.log('✅ API key found (masked):', apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4));
  
  // Test GPT-5 with correct parameters
  console.log('\n🤖 Testing GPT-5 chat completion with correct parameters...');
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
        max_completion_tokens: 100,  // Changed from max_tokens
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
      
      // Test GPT-5-mini as well
      console.log('\n🤖 Testing GPT-5-mini...');
      const miniResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [
            {
              role: 'user',
              content: 'Say "GPT-5-mini is working!"'
            }
          ],
          max_completion_tokens: 50,
        }),
      });
      
      if (miniResponse.ok) {
        const miniResult = await miniResponse.json();
        console.log('✅ GPT-5-mini also working!');
        console.log('   Response:', miniResult.choices[0].message.content);
      }
      
    } else {
      const errorData = await chatResponse.text();
      console.error('❌ GPT-5 request failed:', errorData);
    }
  } catch (error) {
    console.error('❌ Error testing GPT-5:', error.message);
  }

  console.log('\n📊 Test complete!');
  console.log('=====================================\n');
}

// Run the test
testGPT5API();