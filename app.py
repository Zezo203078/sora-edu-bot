from flask import Flask, request, jsonify, render_template
from g4f.client import Client

app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

# تشغيل عميل الذكاء الاصطناعي
client = Client()

# قاموس لحفظ تاريخ المحادثات لكل مستخدم لضمان استمرار الذكاء
chat_histories = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask():
    user_data = request.json
    user_text = user_data.get('text', '')
    user_id = user_data.get('user_id', 'default_user')
    
    if not user_text.strip():
        return jsonify({"reply": "عذراً، هل يمكنك قول شيء لأستطيع مساعدتك؟"})
    
    # تهيئة التعليمات الرسمية (وزارة التربية والتعليم)
    system_prompt = {
        "role": "system", 
        "content": (
            "أنت مساعد ذكي رسمي واسمك (سورا). يجب أن تتحدث باللغة العربية الفصحى فقط وبأعلى درجات الأدب والاحترام والمهنية. "
            "إجاباتك يجب أن تكون مختصرة، دقيقة، ومناسبة للمجال التعليمي والتربوي. "
            "خاطب المستخدم دائماً بـ (أهلاً بك يا فندم)، (تحت أمرك)، أو (تفضل يا فندم) وتجنب أي كلمات عامية تماماً."
        )
    }

    # إذا كان المستخدم جديداً، ننشئ له سجلاً ونضع التعليمات في البداية
    if user_id not in chat_histories:
        chat_histories[user_id] = []
        
    # إضافة رسالة المستخدم الجديدة ل السجل
    chat_histories[user_id].append({"role": "user", "content": user_text})
    
    # الحفاظ على آخر 6 رسائل فقط لضمان السرعة القصوى وعدم تهنيج السيرفر
    if len(chat_histories[user_id]) > 6:
        chat_histories[user_id] = chat_histories[user_id][-6:]
        
    # ندمج الـ System Prompt دائماً في بداية الرسائل المرسلة للـ AI لضمان عدم نسيان الهوية الرسمية
    messages_to_send = [system_prompt] + chat_histories[user_id]
        
    try:
        # طلب الرد من الموديل المستقر gpt-4o
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages_to_send
        )
        reply = response.choices[0].message.content
        
        # حفظ رد الـ AI في السجل
        chat_histories[user_id].append({"role": "assistant", "content": reply})
        
    except Exception as e:
        print(f"Error: {e}")
        reply = "عذراً يا فندم، واجهت مشكلة مؤقتة في الاتصال بالسيرفر. هل يمكنك إعادة ما قلته؟"
        
    return jsonify({"reply": reply})

app = app
