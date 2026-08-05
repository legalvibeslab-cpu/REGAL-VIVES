/* =========================================================
   REGAL VIVES — chat.js（匿名オープンチャットのデモ）

   サーバーには接続していません。投稿はこのブラウザの中だけに表示されます。
   本実装では、下記の TODO を WebSocket / API 呼び出しに置き換えてください。
   登録情報は「大学・大学院名」と「ニックネーム」の2項目のみです。
   ========================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'rv-chat-profile';

  var el = {
    gate:      document.getElementById('chatGate'),
    gateForm:  document.getElementById('chatGateForm'),
    gateSchool:document.getElementById('gateSchool'),
    gateName:  document.getElementById('gateName'),
    gateError: document.getElementById('gateError'),
    me:        document.getElementById('chatMe'),
    meAvatar:  document.getElementById('chatMeAvatar'),
    meName:    document.getElementById('chatMeName'),
    meSchool:  document.getElementById('chatMeSchool'),
    meEdit:    document.getElementById('chatMeEdit'),
    rooms:     document.getElementById('chatRooms'),
    roomTitle: document.getElementById('chatRoomTitle'),
    roomDesc:  document.getElementById('chatRoomDesc'),
    log:       document.getElementById('chatLog'),
    form:      document.getElementById('chatForm'),
    input:     document.getElementById('chatInput'),
    send:      document.getElementById('chatSend')
  };

  if (!el.log || !el.gateForm) return;

  /* ---------- ルームの初期データ ---------- */
  var ROOMS = {
    general: {
      title: '# 全体',
      desc: '科目を問わず、なんでも書き込めるルームです。',
      messages: [
        { name: 'あおい', school: '京都大学法科大学院', time: '21:04',
          text: '今日から答案構成だけを毎日3通やることにしました。続くか不安だけど宣言しておきます。' },
        { name: 'kuro', school: '中央大学法科大学院', time: '21:11',
          text: '宣言えらい。自分も付き合います。構成だけなら30分で終わるので習慣にしやすいですよ。' },
        { name: 'しろくま', school: '早稲田大学法科大学院', time: '21:19',
          text: '模試の判定が前回より上がってた。積み上げが数字で見えるのは思ってたより効きますね。' },
        { name: 'あおい', school: '京都大学法科大学院', time: '21:23',
          text: 'それ聞くと励みになります。次の回、一緒に受けませんか。' }
      ]
    },
    tantou: {
      title: '# 短答式',
      desc: '短答式の過去問・条文素読・出題傾向について。',
      messages: [
        { name: 'ゆう', school: '神戸大学法科大学院', time: '19:42',
          text: '短答は憲法が伸びない…みなさん判例六法どう回してますか。' },
        { name: 'たけ', school: '大阪大学法科大学院', time: '19:55',
          text: '自分は肢別を3周してから判例六法に戻る派です。先に問題形式に慣れたほうが記憶が定着しました。' }
      ]
    },
    ronbun: {
      title: '# 論文式',
      desc: '答案構成・論述の型・答案の見せ方について。',
      messages: [
        { name: 'なな', school: '一橋大学法科大学院', time: '18:20',
          text: '規範定立のあと、あてはめが薄くなる癖があります。同じ人いませんか。' },
        { name: 'しろくま', school: '早稲田大学法科大学院', time: '18:31',
          text: 'あてはめは「問題文の事実を必ず2つ以上引く」と決めておくと機械的に厚くなりますよ。' }
      ]
    },
    yobi: {
      title: '# 予備試験',
      desc: '予備試験ルート、口述対策、スケジュールの相談。',
      messages: [
        { name: 'みなと', school: '東京大学法科大学院', time: '12:07',
          text: '予備の口述、当日の流れがまだ掴めていません。体験談ありがたいです。' }
      ]
    },
    plan: {
      title: '# 学習計画',
      desc: '1日の使い方、直前期の詰め方、可処分時間の話。',
      messages: [
        { name: 'kuro', school: '中央大学法科大学院', time: '08:15',
          text: '朝に短答、夜に論文、で固定しました。時間帯を決めると迷う時間が消えるのでおすすめです。' },
        { name: 'ゆう', school: '神戸大学法科大学院', time: '08:40',
          text: '真似します。夜に短答やると眠くて全然頭に入らなかった…' }
      ]
    },
    goukaku: {
      title: '# 合格者に聞く',
      desc: '合格者が交代で常駐しています。遠慮なくどうぞ。',
      messages: [
        { name: 'あすか', school: '京都大学法科大学院', time: '22:02',
          text: '（合格者）直前期の質問、今夜23時まで拾います。答案の写真は個人情報を消してから貼ってください。' },
        { name: 'なな', school: '一橋大学法科大学院', time: '22:09',
          text: '本番、時間配分が崩れたときはどう立て直しましたか。' }
      ]
    }
  };

  var currentRoom = 'general';
  var profile = null;

  /* ---------- 保存 ---------- */
  function loadProfile() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) { /* noop */ }
  }

  /* ---------- 表示 ---------- */
  function initial(name) {
    return name ? name.trim().charAt(0) : '?';
  }

  function nowHHMM() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function buildMessage(msg, isMine) {
    var li = document.createElement('li');
    li.className = 'msg' + (isMine ? ' msg--mine' : '');

    var avatar = document.createElement('span');
    avatar.className = 'msg__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initial(msg.name);

    var body = document.createElement('div');
    body.className = 'msg__body';

    var head = document.createElement('p');
    head.className = 'msg__head';

    var name = document.createElement('span');
    name.className = 'msg__name';
    name.textContent = msg.name;

    var school = document.createElement('span');
    school.className = 'msg__school';
    school.textContent = msg.school;

    var time = document.createElement('time');
    time.className = 'msg__time';
    time.textContent = msg.time;

    head.appendChild(name);
    head.appendChild(school);
    head.appendChild(time);

    var text = document.createElement('p');
    text.className = 'msg__text';
    text.textContent = msg.text; // textContent なので入力はそのまま文字として扱われます

    body.appendChild(head);
    body.appendChild(text);
    li.appendChild(avatar);
    li.appendChild(body);
    return li;
  }

  function renderRoom(id) {
    var room = ROOMS[id];
    if (!room) return;
    currentRoom = id;

    el.roomTitle.textContent = room.title;
    el.roomDesc.textContent = room.desc;

    el.log.textContent = '';
    room.messages.forEach(function (m) {
      el.log.appendChild(buildMessage(m, !!m.mine));
    });
    el.log.scrollTop = el.log.scrollHeight;
  }

  function applyProfile(p) {
    profile = p;
    var joined = !!p;

    el.gate.hidden = joined;
    el.gate.classList.toggle('is-ready', !joined);
    el.input.disabled = !joined;
    el.send.disabled = !joined;
    el.me.hidden = !joined;

    if (joined) {
      el.meAvatar.textContent = initial(p.name);
      el.meName.textContent = p.name;
      el.meSchool.textContent = p.school;
    }
  }

  /* ---------- 参加フォーム ---------- */
  el.gateForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var school = el.gateSchool.value.trim();
    var name = el.gateName.value.trim();

    if (!school || !name) {
      el.gateError.textContent = '大学・大学院名とニックネームの両方を入力してください。';
      el.gateError.hidden = false;
      return;
    }
    el.gateError.hidden = true;

    var p = { school: school, name: name };
    saveProfile(p);          // TODO: 本実装ではここでアカウント作成APIを呼ぶ
    applyProfile(p);
    el.input.focus();
  });

  /* ---------- プロフィール変更 ---------- */
  el.meEdit.addEventListener('click', function () {
    if (profile) {
      el.gateSchool.value = profile.school;
      el.gateName.value = profile.name;
    }
    applyProfile(null);
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* noop */ }
    el.gateSchool.focus();
  });

  /* ---------- ルーム切り替え ---------- */
  el.rooms.addEventListener('click', function (e) {
    var btn = e.target.closest('.chat-room');
    if (!btn) return;

    Array.prototype.forEach.call(
      el.rooms.querySelectorAll('.chat-room'),
      function (b) { b.classList.toggle('is-active', b === btn); }
    );
    renderRoom(btn.getAttribute('data-room'));
  });

  /* ---------- 送信 ---------- */
  function sendMessage() {
    if (!profile) return;
    var text = el.input.value.trim();
    if (!text) return;

    var msg = {
      name: profile.name,
      school: profile.school,
      time: nowHHMM(),
      text: text,
      mine: true
    };

    ROOMS[currentRoom].messages.push(msg);  // TODO: 本実装ではここでサーバーへ送信
    el.log.appendChild(buildMessage(msg, true));
    el.log.scrollTop = el.log.scrollHeight;

    el.input.value = '';
    autoGrow();
    el.input.focus();
  }

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage();
  });

  // Enterで送信、Shift+Enterで改行
  el.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 入力欄の高さを内容に合わせる
  function autoGrow() {
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(el.input.scrollHeight, 132) + 'px';
  }
  el.input.addEventListener('input', autoGrow);

  /* ---------- 初期化 ---------- */
  renderRoom(currentRoom);
  applyProfile(loadProfile());
})();
