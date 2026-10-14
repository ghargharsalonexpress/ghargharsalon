# Professional application: Google Form questions

The client creates this form in their own Google account. Answers go to a Google Sheet, and files to a Drive folder shared only with admins. The admin uses the answers to create the professional's account (`/admin/professionals/new`).

**Language:** each question is shown in Hindi and English. The Hindi below is a first draft and **must be checked by a native speaker**.

**Note:** questions with file uploads make the applicant sign in with a Google (Gmail) account. This is a Google Forms rule.

## Section 1: About you · आपके बारे में
| # | Question (English / Hindi) | Type | Required | Notes |
|---|---|---|---|---|
| 1 | Full name / पूरा नाम | Short answer | Yes | As on ID proof |
| 2 | Mobile number / मोबाइल नंबर | Short answer | Yes | Validation: regex `^[6-9][0-9]{9}$` |
| 3 | Email / ईमेल | Short answer (email) | Yes | Used to log in to the professional panel |
| 4 | Gender / लिंग | Multiple choice: Female / Male / Other | Yes | Customers can ask for a female or male professional |
| 5 | Date of birth / जन्म तिथि | Date | Yes | Admin checks age 18+ |
| 6 | Languages you speak / आप कौन-सी भाषाएँ बोलते हैं | Checkboxes: Hindi, English, Other | Yes | — |

## Section 2: Your work · आपका काम
| # | Question | Type | Required | Notes |
|---|---|---|---|---|
| 7 | Services you can do / आप कौन-सी सेवाएँ दे सकते हैं | Checkboxes (below) | Yes | Becomes the professional's skills |
| 8 | Years of experience / कितने साल का अनुभव | Short answer (number) | Yes | — |
| 9 | Certificates, if any / प्रमाणपत्र (अगर हों) | Short answer | No | — |
| 10 | Tell us about your work / अपने काम के बारे में बताइए | Paragraph | No | Up to 500 characters |

Options for question 7 (matching the catalogue):

| For | Options |
|---|---|
| Women | Salon services (waxing, threading, facials, clean-up, bleach, manicure & pedicure, body polishing) · Makeup & styling · Hair cut & styling · Spa & massage |
| Men | Massage (stress and pain relief) · Skin care & scrubs · Monthly grooming · Face grooming |

## Section 3: Where and when you work · कहाँ और कब काम करते हैं
| # | Question | Type | Required | Notes |
|---|---|---|---|---|
| 11 | Your home area (sector / locality) and pincode / आपका इलाका और पिनकोड | Short answer | Yes | Sets the base location |
| 12 | How far can you travel for a job? / काम के लिए कितनी दूर तक जा सकते हैं? | Multiple choice: 3 km / 5 km / 8 km | Yes | The platform maximum is set by admin |
| 13 | Usual working days / आमतौर पर किन दिनों काम करते हैं | Checkboxes: Mon–Sun | Yes | For rostering only; online status decides offers |
| 14 | Usual working time / आमतौर पर किस समय | Checkboxes: Morning / Afternoon / Evening | Yes | Same |
| 15 | Which phone do you use? / आप कौन-सा फ़ोन इस्तेमाल करते हैं? | Multiple choice: Android / iPhone | Yes | Onboarding help (ADR-0008) |
| 16 | Do you have mobile internet while travelling? / क्या चलते समय आपके फ़ोन में इंटरनेट रहता है? | Yes / No | Yes | Needed for job alerts and live location |

## Section 4: Documents · दस्तावेज़
| # | Question | Type | Required | Notes |
|---|---|---|---|---|
| 17 | ID proof: Aadhaar or PAN / पहचान पत्र (आधार या पैन) | File upload (image/PDF, max 10 MB) | Yes | Stays in the client's Drive only |
| 18 | A clear photo of you / आपकी साफ़ फ़ोटो | File upload (image) | Yes | Shown to customers after they book |
| 19 | Photos of your work (up to 5) / आपके काम की फ़ोटो (5 तक) | File upload (images) | No | — |
| 20 | Business name and GST number, if any / बिज़नेस का नाम और GST नंबर (अगर हो) | Short answer | No | — |

## Section 5: Consent · सहमति
| # | Statement | Type | Required |
|---|---|---|---|
| 21 | I agree to identity and background verification. / मैं पहचान और बैकग्राउंड जाँच के लिए सहमत हूँ। | Checkbox | Yes |
| 22 | While I am travelling to a customer, my live location will be shown to that customer. / ग्राहक के पास जाते समय मेरी लाइव लोकेशन उस ग्राहक को दिखेगी। | Checkbox | Yes |
| 23 | During a job, the customer and I can see each other's phone number. / काम के दौरान ग्राहक और मैं एक-दूसरे का फ़ोन नंबर देख सकते हैं। | Checkbox | Yes |
| 24 | The information I have given is correct. / मेरी दी गई जानकारी सही है। | Checkbox | Yes |

## Confirmation message
"Thank you. We will check your details and call you within 3 working days. / धन्यवाद। हम आपकी जानकारी जाँचकर 3 कामकाजी दिनों में आपको कॉल करेंगे।"
