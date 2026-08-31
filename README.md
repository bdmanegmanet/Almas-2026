# আদর্শ আল মাস ছাত্রাবাস — Border Account v2

## Google Apps Script setup
1. Google Sheets ID: `1_sOWw0y_PtlD_FnccVpvt5Pydm469fiIKDP5Fc5bOU4`
2. Code.gs paste করুন।
3. `setupSheets()` একবার Run করুন। এটি ঠিক ৩টি sheet বানাবে: `ওয়েবসাইট confi.`, `টাকার হিসাব`, `চালের হিসাব`।
4. `setAdminPassword('আপনার-নিজস্ব-শক্তিশালী-পাসওয়ার্ড')` একবার Run করুন। কোনো default password নেই।
5. Deploy > New deployment > Web app > Execute as Me > Anyone.
6. Web app URL-টি ওয়েবসাইটের Admin Dashboard > Settings-এ দিন।

## Slider image
Google Drive link বা সরাসরি `https://lh3.googleusercontent.com/d/IMAGE_ID` দিন। Code নিজেই Drive `/file/d/ID` কে এই format-এ রূপান্তর করে।

## Calculation
মিল খরচ = মিল সংখ্যা × মিল রেট
মোট খরচ = মিল খরচ + অতিরিক্ত + বিবিধ
মোট খরচ > মোট জমা হলে ম্যানেজার পাবে = পার্থক্য
অন্যথায় বর্ডার পাবে = পার্থক্য

## Frontend
Noto Serif Bengali ব্যবহার করা হয়েছে। Public UI-তে settings/configuration নেই; এগুলো শুধু authenticated Admin Dashboard-এ।
