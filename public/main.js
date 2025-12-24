// UI Elements
const callBtn = document.getElementById('call-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const chatMessages = document.getElementById('chat-messages');
const instructionsInput = document.getElementById('instructions');
const voiceSelect = document.getElementById('voice');
const micSelect = document.getElementById('microphone');

// Add new UI element
const initialGreetingInput = document.getElementById('initial-greeting');

// State
let peerConnection = null;
let dataChannel = null;
let isCallActive = false;
let localStream = null;
let audioContext = null;
let analyser = null;
let silenceStart = null;
let aiResponseDone = false;

// Settings
let currentSettings = {
  instructions: "日本語で親しみやすく話してください。",
  initialGreeting: "こんにちは！チャッピーです。何かお手伝いできることはありますか？",
  voice: "verse",
  model: "gpt-realtime-2025-08-28",
  microphoneId: ""
};

// ...

// Load Settings from Server
async function loadSettings() {
  try {
    const res = await fetch('/settings');
    if (res.ok) {
      const savedSettings = await res.json();
      currentSettings = { ...currentSettings, ...savedSettings };

      // Reflect to UI
      instructionsInput.value = currentSettings.instructions;
      if (initialGreetingInput) initialGreetingInput.value = currentSettings.initialGreeting || "こんにちは！チャッピーです。何かお手伝いできることはありますか？";
      voiceSelect.value = currentSettings.voice;
      if (currentSettings.model) modelSelect.value = currentSettings.model;
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

// ...

// UI Event Listeners
settingsBtn.addEventListener('click', async () => {
  // ...
  // Ensure UI matches current settings
  instructionsInput.value = currentSettings.instructions;
  if (initialGreetingInput) initialGreetingInput.value = currentSettings.initialGreeting;
  voiceSelect.value = currentSettings.voice;
  modelSelect.value = currentSettings.model;

  settingsModal.classList.add('open');
});

// ...

saveSettingsBtn.addEventListener('click', async () => {
  currentSettings.instructions = instructionsInput.value;
  if (initialGreetingInput) currentSettings.initialGreeting = initialGreetingInput.value;
  currentSettings.voice = voiceSelect.value;
  currentSettings.microphoneId = micSelect.value;
  currentSettings.model = modelSelect.value;

  await saveSettings();
  // ...
});

// ...

// Update session during call (inject response.create with greeting)
function updateSession() {
  // ... (existing updateSession logic)
  const event = {
    // ...
  };
  dataChannel.send(JSON.stringify(event));
  appendMessage('ai', '[システム] 設定を更新しました');

  // Trigger initial AI greeting
  setTimeout(() => {
    const greetingText = currentSettings.initialGreeting || "こんにちは！チャッピーです。何かお手伝いできることはありますか？";
    const responseCreate = {
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: `「${greetingText}」と元気に挨拶してください。`,
      }
    };
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(responseCreate));
      console.log("Sent initial greeting request");
    }
  }, 500);
}

// Cost Constants (per 1M tokens)
const COST_RATES = {
  "gpt-realtime-2025-08-28": { input: 32.00, cached_input: 0.50, output: 64.00 },
  "gpt-realtime-mini-2025-10-06": { input: 10.00, cached_input: 0.30, output: 20.00 }
};

let sessionUsage = {
  total_tokens: 0,
  input_tokens: 0,
  output_tokens: 0,
  input_token_details: {
    cached_tokens: 0,
    text_tokens: 0,
    audio_tokens: 0
  },
  output_token_details: {
    text_tokens: 0,
    audio_tokens: 0
  }
};

// UI Elements (Add modelSelect)
const modelSelect = document.getElementById('model');

// Utils
function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  // Scroll to bottom
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// Load Settings from Server
async function loadSettings() {
  try {
    const res = await fetch('/settings');
    if (res.ok) {
      const savedSettings = await res.json();
      // Merge saved settings into current, keeping defaults for missing keys
      currentSettings = { ...currentSettings, ...savedSettings };

      // Reflect to UI
      instructionsInput.value = currentSettings.instructions;
      voiceSelect.value = currentSettings.voice;
      if (currentSettings.model) modelSelect.value = currentSettings.model;
      // microphoneId is handled in getMicrophones after enumeration
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

// Save Settings to Server
async function saveSettings() {
  try {
    await fetch('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentSettings)
    });
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
}

// Device Management
async function getMicrophones() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    micSelect.innerHTML = '<option value="">デフォルト</option>';
    audioInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `マイク ${micSelect.length + 1}`;
      micSelect.appendChild(option);
    });

    // Restore selection if exists and still available
    if (currentSettings.microphoneId) {
      const exists = audioInputs.some(d => d.deviceId === currentSettings.microphoneId);
      if (exists) micSelect.value = currentSettings.microphoneId;
    }
  } catch (err) {
    console.error("Error enumerating devices:", err);
  }
}

navigator.mediaDevices.addEventListener('devicechange', getMicrophones);

// UI Event Listeners
settingsBtn.addEventListener('click', async () => {
  // Refresh mic list when opening settings
  try {
    await getMicrophones();
  } catch (e) { }

  // Ensure UI matches current settings (in case changed externally or by default)
  instructionsInput.value = currentSettings.instructions;
  voiceSelect.value = currentSettings.voice;
  modelSelect.value = currentSettings.model;

  settingsModal.classList.add('open');
});

closeBtn.addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('open');
  }
});

saveSettingsBtn.addEventListener('click', async () => {
  currentSettings.instructions = instructionsInput.value;
  currentSettings.voice = voiceSelect.value;
  currentSettings.microphoneId = micSelect.value;
  currentSettings.model = modelSelect.value;

  await saveSettings();

  if (isCallActive && dataChannel && dataChannel.readyState === 'open') {
    updateSession();
  }

  settingsModal.classList.remove('open');
});

// Update session during call
function updateSession() {
  const event = {
    type: "session.update",
    session: {
      instructions: currentSettings.instructions,
      voice: currentSettings.voice,
      input_audio_transcription: {
        model: "whisper-1"
      },
      tools: [
        {
          type: "function",
          name: "end_call",
          description: "End the conversation and disconnect the call. Use this when the user says goodbye or asking to end the call.",
        }
      ],
      tool_choice: "auto"
    }
  };
  dataChannel.send(JSON.stringify(event));
  appendMessage('ai', '[システム] 設定を更新しました');

  // Trigger initial AI greeting
  setTimeout(() => {
    const greetingText = currentSettings.initialGreeting || "こんにちは！チャッピーです。何かお手伝いできることはありますか？";
    const responseCreate = {
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: `「${greetingText}」と元気に挨拶してください。`,
      }
    };
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(responseCreate));
      console.log("Sent initial greeting request");
    }
  }, 500);
}

// WebRTC Logic
async function startCall() {
  try {
    callBtn.disabled = true;
    settingsBtn.disabled = true;

    // Reset usage and disconnect flag
    sessionUsage = {
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      input_token_details: { cached_tokens: 0, text_tokens: 0, audio_tokens: 0 },
      output_token_details: { text_tokens: 0, audio_tokens: 0 }
    };
    shouldDisconnect = false;
    aiResponseDone = false;
    silenceStart = null;

    // 1. Get ephemeral token from our server using POST
    const tokenResponse = await fetch("/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: currentSettings.model,
        voice: currentSettings.voice
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(await tokenResponse.text());
    }

    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // 2. Create PeerConnection
    peerConnection = new RTCPeerConnection({
      iceServers: []
    });

    // 3. Audio Element for playback
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    peerConnection.ontrack = e => {
      audioEl.srcObject = e.streams[0];
      // Setup AudioContext for VAD (Silence Detection)
      setupAudioAnalysis(e.streams[0]);
    };

    // 4. Data Channel
    dataChannel = peerConnection.createDataChannel("oai-events");
    dataChannel.addEventListener("message", handleDataChannelMessage);
    dataChannel.addEventListener("open", () => {
      isCallActive = true;
      callBtn.classList.add('active');
      callBtn.disabled = false;
      updateSession();
    });

    // 5. Get Microphone Stream
    const constraints = {
      audio: currentSettings.microphoneId ? { deviceId: { exact: currentSettings.microphoneId } } : true
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // 6. Offer / Answer exchange
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    // Use the model selected in settings
    const model = currentSettings.model;
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp"
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await peerConnection.setRemoteDescription(answer);

    settingsBtn.disabled = true;

  } catch (err) {
    console.error("Failed to start call:", err);
    endCall();
    alert("通話を開始できませんでした。" + err.message);
  }
}

function calculateCost(usage, modelId) {
  const rates = COST_RATES[modelId] || COST_RATES["gpt-realtime-2025-08-28"]; // Fallback

  if (!usage) return 0;

  // Calculate cost based on usage details if available, otherwise simplified
  // Usage object usually has: input_tokens, output_tokens, input_token_details: { cached_tokens, ... }

  const inputTotal = usage.input_tokens || 0;
  const cachedInput = usage.input_token_details && usage.input_token_details.cached_tokens ? usage.input_token_details.cached_tokens : 0;
  const nonCachedInput = Math.max(0, inputTotal - cachedInput);
  const outputTotal = usage.output_tokens || 0;

  const cost = (
    (nonCachedInput * rates.input) +
    (cachedInput * rates.cached_input) +
    (outputTotal * rates.output)
  ) / 1000000;

  return cost;
}

// Rate State
let exchangeRate = 150; // Default

// ... (Load Settings from Server) ...

// Fetch Exchange Rate
async function fetchExchangeRate() {
  try {
    const res = await fetch('/rate');
    if (res.ok) {
      const data = await res.json();
      if (data.rate) {
        exchangeRate = data.rate;
        console.log("Current Exchange Rate (USDJPY):", exchangeRate);
      }
    }
  } catch (err) {
    console.error("Failed to fetch exchange rate:", err);
  }
}

// ... (existing functions) ...

function stopCall() {
  // Calculate and show cost before ending
  const costUSD = calculateCost(sessionUsage, currentSettings.model);
  const costJPY = costUSD * exchangeRate;

  const costStrUSD = costUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 });
  const costStrJPY = Math.round(costJPY).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

  const usageStr = `Total Tokens: ${sessionUsage.total_tokens} (In: ${sessionUsage.input_tokens}, Out: ${sessionUsage.output_tokens})`;

  appendMessage('ai', `[通話終了] ${usageStr}`);
  appendMessage('ai', `[概算費用] ${costStrUSD} (${costStrJPY})`);

  endCall();
}

function endCall() {
  isCallActive = false;
  callBtn.classList.remove('active');
  callBtn.disabled = false;
  settingsBtn.disabled = false;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

callBtn.addEventListener('click', () => {
  if (isCallActive) {
    stopCall();
  } else {
    startCall();
  }
});

function handleDataChannelMessage(e) {
  try {
    const event = JSON.parse(e.data);

    switch (event.type) {
      case 'response.function_call_arguments.done':
        // Handle function calling
        if (event.name === 'end_call') {
          console.log("AI requested to end call. Marking for disconnect and muting mic.");
          shouldDisconnect = true;
          // Mute mic immediately to prevent interruption
          if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = false);
          }
          appendMessage('ai', '[システム] 通話を終了しています...');
        }
        break;

      case 'response.audio_transcript.done':
        // AI spoke - reliable transcript event
        if (event.transcript) {
          appendMessage('ai', event.transcript);
        }
        break;

      case 'response.done':
        // Check usage and other completion details
        if (event.response) {
          // Aggregate Usage
          if (event.response.usage) {
            const u = event.response.usage;
            sessionUsage.total_tokens += u.total_tokens || 0;
            sessionUsage.input_tokens += u.input_tokens || 0;
            sessionUsage.output_tokens += u.output_tokens || 0;

            if (u.input_token_details) {
              sessionUsage.input_token_details.cached_tokens += u.input_token_details.cached_tokens || 0;
              sessionUsage.input_token_details.text_tokens += u.input_token_details.text_tokens || 0;
              sessionUsage.input_token_details.audio_tokens += u.input_token_details.audio_tokens || 0;
            }
            if (u.output_token_details) {
              sessionUsage.output_token_details.text_tokens += u.output_token_details.text_tokens || 0;
              sessionUsage.output_token_details.audio_tokens += u.output_token_details.audio_tokens || 0;
            }
          }
        }

        // Handle delayed disconnect with VAD (Silence Detection)
        if (shouldDisconnect) {
          aiResponseDone = true;
          console.log("AI response done. Starting silence detection...");
          checkSilence();
          // Fail-safe timeout (10s)
          setTimeout(() => {
            if (isCallActive) {
              console.log("Fail-safe disconnect triggered.");
              stopCall();
            }
          }, 10000);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User spoke
        if (event.transcript) {
          appendMessage('user', event.transcript);
        }
        break;
    }
  } catch (err) {
    console.error("Error handling data channel message:", err);
  }
}

// Audio Analysis for VAD
function setupAudioAnalysis(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    // Do not connect to destination effectively muting it if we do (but we want to hear it via audioEl)
    // The audioEl handles playback. Analyser just analyzes.
  } catch (e) {
    console.error("Audio Context setup failed:", e);
  }
}

function checkSilence() {
  if (!isCallActive || !analyser || !shouldDisconnect) return;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Calculate average volume
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;

  // console.log("VAD Level:", average); // Debug logging removed

  // Threshold close to 0 (silence)
  // If average < 10 for a certain duration
  if (average < 10) {
    if (!silenceStart) {
      silenceStart = Date.now();
    } else if (Date.now() - silenceStart > 1000) { // 1 second of silence
      console.log("Silence detected. Disconnecting.");
      stopCall();
      return;
    }
  } else {
    silenceStart = null; // Reset if sound detected
  }

  requestAnimationFrame(checkSilence);
}

// Initial settings load and mic check
loadSettings().then(() => {
  fetchExchangeRate();
  getMicrophones();
});
