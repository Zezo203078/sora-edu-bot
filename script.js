const micBtn = document.getElementById('mic-btn');
const chatText = document.getElementById('chat-text');
const robotMouth = document.getElementById('robot-mouth');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'ar-EG'; // المتصفح يستمع للغة العربية المحدثة
recognition.continuous = false; // جعلناها false ونقوم بإدارتها يدوياً لمنع التعليق المستمر
recognition.interimResults = false;

let isListening = false;
let speechTimeout;

// توليد معرف فريد للمستخدم لحفظ سياق المحادثة بدقة
if (!localStorage.getItem('chat_user_id')) {
    localStorage.setItem('chat_user_id', 'user_' + Math.random().toString(36).substr(2, 9));
}
const userId = localStorage.getItem('chat_user_id');

micBtn.addEventListener('click', () => {
    if (!isListening) {
        startListening();
    } else {
        stopListening();
    }
});

function startListening() {
    isListening = true;
    window.speechSynthesis.cancel(); // إيقاف أي صوت شغال فوراً
    try {
        recognition.start();
        micBtn.innerText = "🔴 النظام يستمع إليك الآن...";
        micBtn.classList.add('listening');
        chatText.innerText = "أنا أستمع إليك يا فندم...";
    } catch (e) {
        console.log("Recognition already started");
    }
}

function stopListening() {
    isListening = false;
    recognition.stop();
    micBtn.innerText = "🟢 تشغيل النظام المستمر";
    micBtn.classList.remove('listening');
}

// في حال توقف المايك تلقائياً وكان وضع التشغيل نشطاً، يعيد تشغيل نفسه ذكياً
recognition.onend = function() {
    // لا نعيد تشغيل المايك إذا كان الروبوت يتحدث حالياً لمنع التداخل
    if (isListening && !window.speechSynthesis.speaking) {
        try { recognition.start(); } catch(e){}
    }
};

recognition.onresult = function(event) {
    const currentResultIndex = event.resultIndex;
    const userText = event.results[currentResultIndex][0].transcript.trim();
    
    if (!userText) return;

    chatText.innerText = "أنت: " + userText;
    
    // إيقاف الاستماع مؤقتاً أثناء معالجة الطلب ونطق الروبوت لمنع التهنيج
    recognition.stop(); 
    generateRobotResponse(userText);
};

async function generateRobotResponse(text) {
    chatText.innerText = "جاري المعالجة...";
    
    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text: text,
                user_id: userId
            })
        });
        
        const data = await response.json();
        robotSpeak(data.reply);

    } catch (error) {
        console.error("Error:", error);
        robotSpeak("عذراً يا فندم، حدث خطأ غير متوقع في النظام. يرجى المحاولة مرة أخرى.");
    }
}

function robotSpeak(message) {
    chatText.innerText = "سورا: " + message;
    
    window.speechSynthesis.cancel(); // أمان إضافي لمنع تداخل الأصوات

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ar'; // نطق بالفصحى الرسمية

    utterance.onstart = function() { 
        robotMouth.classList.add('talking'); 
    };
    
    utterance.onend = function() { 
        robotMouth.classList.remove('talking'); 
        // بعد أن ينتهي الروبوت من الرد تماماً، نعيد فتح المايك تلقائياً لمتابعة الحوار
        if (isListening) {
            try { recognition.start(); } catch(e){}
        }
    };

    window.speechSynthesis.speak(utterance);
}