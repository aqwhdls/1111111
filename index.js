// 1. 프로필 사진 (2종)
const AVATARS = ['🐱', '🐶'];

const NAMES = ['김철수', '이영희', '박민수', '최지은', '정수현', '강동원'];

// 2. 말투 종류 (3종)
const SPEECH_STYLES = [
  { type: 'formal', ending: '합니다.', desc: '말끝을 "~합니다"로 마침' },
  { type: 'cute', ending: '했어용!', desc: '말끝을 "~했어용"으로 마침' },
  { type: 'informal', ending: '함.', desc: '말끝을 "~함"으로 단정 지음' }
];

let players = [];
let aiPlayer = null;
let lives = 3;
let currentDay = 1;
let evidences = [];
let currentEvidenceIndex = 0;

// DOM 요소
const chatBox = document.getElementById('chat-box');
const dayCountEl = document.getElementById('day-count');
const livesCountEl = document.getElementById('lives-count');
const suspectListEl = document.getElementById('suspect-list');
const questionSelect = document.getElementById('question-select');
const sendBtn = document.getElementById('send-btn');
const suspectSelect = document.getElementById('suspect-select');
const kickBtn = document.getElementById('kick-btn');

// 모달 요소
const evidenceBtn = document.getElementById('evidence-btn');
const evidenceModal = document.getElementById('evidence-modal');
const evidenceTextEl = document.getElementById('evidence-text');
const evidenceIndexEl = document.getElementById('evidence-index');
const evidenceTotalEl = document.getElementById('evidence-total');
const prevEvidenceBtn = document.getElementById('prev-evidence-btn');
const nextEvidenceBtn = document.getElementById('next-evidence-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// 나이 범위 구분 함수 (0: 20대 초반, 1: 20대 후반, 2: 30대 초반, 3: 30대 후반)
function getAgeRangeCategory(age) {
  if (age < 25) return 0;
  if (age < 30) return 1;
  if (age < 35) return 2;
  return 3;
}

function getAgeRangeText(category) {
  const rangeTexts = ['20대 초반(20~24세)', '20대 후반(25~29세)', '30대 초반(30~34세)', '30대 후반(35~39세)'];
  return rangeTexts[category];
}

// 특정 연령대 카테고리에 속하는 나이 생성
function generateAgeInCategory(category) {
  const baseAges = [20, 25, 30, 35];
  return baseAges[category] + Math.floor(Math.random() * 5);
}

// 게임 초기화
function initGame() {
  lives = 3;
  currentDay = 1;
  evidences = [];
  currentEvidenceIndex = 0;
  chatBox.innerHTML = '';
  
  const shuffledNames = [...NAMES].sort(() => 0.5 - Math.random());
  const aiIndex = Math.floor(Math.random() * 6);

  // 1. AI 정보 설정
  const aiAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const aiSpeech = SPEECH_STYLES[Math.floor(Math.random() * SPEECH_STYLES.length)];
  const aiAgeCategory = Math.floor(Math.random() * 4); // 0~3 중 하나
  const aiAge = generateAgeInCategory(aiAgeCategory);

  // 2. 플레이어 데이터 생성 및 unique 3가지 특성 보장
  players = shuffledNames.map((name, index) => {
    if (index === aiIndex) {
      return {
        id: index,
        name: name,
        avatar: aiAvatar,
        age: aiAge,
        speech: aiSpeech,
        isAi: true,
        status: 'none'
      };
    }

    // 인간 생성: 기본 무작위 배치 후, AI와 3가지 특징이 모두 같아지면 1개를 다르게 변경
    let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    let speech = SPEECH_STYLES[Math.floor(Math.random() * SPEECH_STYLES.length)];
    let ageCategory = Math.floor(Math.random() * 4);

    // AI와 (사진, 말투, 나이범위) 3가지가 전부 일치하면 강제로 하나 변경
    if (avatar === aiAvatar && speech.type === aiSpeech.type && ageCategory === aiAgeCategory) {
      // 나이 범위를 AI와 다른 범위로 변경
      ageCategory = (aiAgeCategory + 1) % 4;
    }

    return {
      id: index,
      name: name,
      avatar: avatar,
      age: generateAgeInCategory(ageCategory),
      speech: speech,
      isAi: false,
      status: 'none'
    };
  });

  aiPlayer = players[aiIndex];

  // 단서 3개 생성
  evidences = [
    `단서 1 (사진)\nAI의 프로필 사진은 '${aiPlayer.avatar}' 모양입니다.`,
    `단서 2 (말투)\nAI는 대화할 때 ${aiPlayer.speech.desc}.`,
    `단서 3 (나이)\nAI의 연령대는 ${getAgeRangeText(getAgeRangeCategory(aiPlayer.age))} 범위에 속합니다.`
  ];

  updateUI();
  renderMemoBoard();
  addSystemMessage(`게임이 시작되었습니다. 오픈채팅방에 6명이 입장했습니다.`);
  addSystemMessage(`3가지 단서에 모두 부합하는 유일한 AI 1명을 찾아내세요!`);
}

// UI 전체 업데이트
function updateUI() {
  dayCountEl.textContent = currentDay;
  livesCountEl.textContent = '♥'.repeat(lives);

  // 강퇴 셀렉트 박스
  suspectSelect.innerHTML = '<option value="">-- 내보낼 대상 선택 --</option>';
  players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.avatar} ${p.name}`;
    suspectSelect.appendChild(opt);
  });
}

// 용의자 메모 보드 그리기
function renderMemoBoard() {
  suspectListEl.innerHTML = '';
  players.forEach(p => {
    const card = document.createElement('div');
    card.className = `suspect-card status-${p.status}`;

    let statusText = '일반';
    if (p.status === 'candidate') statusText = '★ 후보';
    if (p.status === 'exclude') statusText = '✖ 제외';

    card.innerHTML = `
      <div class="suspect-avatar">${p.avatar}</div>
      <div class="suspect-name">${p.name}</div>
      <button class="status-btn">${statusText}</button>
    `;

    // 상태 변경 클릭 버튼 (일반 -> 후보 -> 제외 -> 일반)
    const btn = card.querySelector('.status-btn');
    btn.addEventListener('click', () => {
      if (p.status === 'none') p.status = 'candidate';
      else if (p.status === 'candidate') p.status = 'exclude';
      else p.status = 'none';

      renderMemoBoard();
    });

    suspectListEl.appendChild(card);
  });
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'system-msg';
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addChatMessage(sender, text, isUser = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `msg-wrapper ${isUser ? 'user' : ''}`;

  if (isUser) {
    wrapper.innerHTML = `
      <div class="msg-content">
        <div class="msg-bubble">${text}</div>
      </div>
    `;
  } else {
    wrapper.innerHTML = `
      <div class="profile-img">${sender.avatar}</div>
      <div class="msg-content">
        <div class="user-name">${sender.name}</div>
        <div class="msg-bubble">${text}</div>
      </div>
    `;
  }

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 질문 전송
sendBtn.addEventListener('click', () => {
  const qType = questionSelect.value;
  if (!qType) return;

  const userQueryText = questionSelect.options[questionSelect.selectedIndex].text;
  addChatMessage(null, userQueryText, true);
  questionSelect.value = '';

  setTimeout(() => {
    players.forEach((p, idx) => {
      setTimeout(() => {
        let answer = '';
        if (qType === 'age') answer = `저는 ${p.age}살${p.speech.ending}`;
        else if (qType === 'speech') answer = `주말엔 주로 휴식을 취${p.speech.ending}`;
        else if (qType === 'hobby') answer = `독서랑 운동을 즐겨 ${p.speech.ending}`;
        
        addChatMessage(p, answer);
      }, idx * 300);
    });
  }, 400);
});

// 강퇴하기
kickBtn.addEventListener('click', () => {
  const targetId = parseInt(suspectSelect.value);
  if (isNaN(targetId)) return;

  const targetPlayer = players.find(p => p.id === targetId);

  if (targetPlayer.isAi) {
    alert(`"${targetPlayer.name}"은(는) AI가 맞았습니다!\n\nAI를 퇴출하고 모두의 영웅이 되었습니다!`);
    initGame();
  } else {
    lives--;
    addSystemMessage(`${targetPlayer.name}님은 인간이였습니다.`);

    // 남아있는 사람만 유지
    players = players.filter(p => p.id !== targetId);

    if (lives <= 0) {
      alert("당신은 모두의 비난을 받고 퇴출당했습니다.");
      initGame();
    } else {
      currentDay++;
      updateUI();
      renderMemoBoard();
    }
  }
});

// 단서 카드 넘기기 업데이트
function updateEvidenceCard() {
  evidenceTextEl.innerText = evidences[currentEvidenceIndex];
  evidenceIndexEl.textContent = currentEvidenceIndex + 1;
  evidenceTotalEl.textContent = evidences.length;
}

// 단서 모달 열기
evidenceBtn.addEventListener('click', () => {
  currentEvidenceIndex = 0;
  updateEvidenceCard();
  evidenceModal.classList.remove('hidden');
});

// 이전/다음 단서 버튼
prevEvidenceBtn.addEventListener('click', () => {
  if (currentEvidenceIndex > 0) {
    currentEvidenceIndex--;
    updateEvidenceCard();
  }
});

nextEvidenceBtn.addEventListener('click', () => {
  if (currentEvidenceIndex < evidences.length - 1) {
    currentEvidenceIndex++;
    updateEvidenceCard();
  }
});

closeModalBtn.addEventListener('click', () => {
  evidenceModal.classList.add('hidden');
});

// 게임 시작
initGame();