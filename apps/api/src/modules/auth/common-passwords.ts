/**
 * Passwords of 8+ characters that appear at the top of public breach lists, plus common
 * Indian patterns. Shorter ones are already refused by the length rule. `passwordProblem`
 * also catches variants (leetspeak, trailing digits, sequences, repeats), so this list
 * only needs the base forms. Lower-case.
 */
const LIST = `
password passwords password1 password12 password123 password1234 passw0rd p@ssword p@ssw0rd
12345678 123456789 1234567890 0987654321 87654321 987654321 11111111 22222222 33333333 44444444
55555555 66666666 77777777 88888888 99999999 00000000 12121212 11223344 12344321 13579246
123123123 112233445 123321123 147258369 159753258 147852369 789456123 741852963 102030405
qwertyui qwertyuiop qwerty123 qwerty1234 qwerty12 asdfghjk asdfghjkl asdf1234 zxcvbnm1 zaq12wsx
1qaz2wsx 1q2w3e4r 1q2w3e4r5t 1qazxsw2 qazwsxedc q1w2e3r4 a1b2c3d4 abcd1234 abc12345 abcdefgh
abc123456 aa123456 aaaaaaaa iloveyou iloveyou1 iloveyou2 iloveu123 loveyou1 lovelove sunshine
princess football baseball basketball superman batman123 starwars welcome1 welcome123 letmein1
letmein123 trustno1 dragon123 monkey123 master123 shadow123 michael1 jennifer computer
internet whatever freedom1 charlie1 jordan23 liverpool chelsea1 arsenal1 manchester football1
admin123 admin1234 administrator root1234 changeme default1 secret123 test1234 testing123
guest123 user1234 login123 pass1234 mypassword newpassword yourpassword samsung1 samsung123
nokia123 iphone123 android1 google123 facebook1 whatsapp instagram youtube1 gmail123
india123 india@123 bharat123 hindustan jaihind1 vandemataram mumbai123 delhi123 kolkata1
chennai123 bangalore hyderabad pune1234 faridabad gurgaon1 noida123 lucknow1 jaipur123
krishna1 krishna123 harekrishna radhakrishna radheradhe radhe123 shriram1 jaishreeram
jaishriram ramayana hanuman1 hanuman123 jaihanuman ganesh123 ganpati1 ganapati omsairam
sairam123 saibaba1 jaimatadi jaimatadi1 mahadev1 harharmahadev omnamahshivaya shiva123
durga123 lakshmi1 saraswati waheguru1 bismillah allah786 786786786 mashallah
sachin10 sachin123 dhoni007 virat18 kohli18 cricket1 cricket123 ipl2024 rcb12345 csk12345
priyanka anjali123 pooja123 neha1234 rahul123 rohit123 amit1234 sunita123 kavita123
deepak123 vikas123 ankit123 manish123 suresh123 ramesh123 mahesh123 rajesh123 sanjay123
mother123 father123 mummy123 papa1234 family123 beauty123 salon123 spa12345 brand123
`;

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(LIST.split(/\s+/).filter(Boolean));

/**
 * Words that are weak as the only letters of a password ("Krishna@123", "Rahul1995",
 * "Qwerty!"). Compared with the password's letters after digits, symbols and leetspeak
 * at the ends are removed.
 */
const BASE = `
password passwd pass qwerty qwertz azerty asdf zxcv admin administrator root user guest test login
welcome letmein iloveyou loveyou love lover monkey dragon master shadow sunshine princess football
baseball basketball cricket superman batman starwars computer internet whatever freedom secret
default changeme trustno charlie jordan liverpool chelsea arsenal manchester hello
india bharat hindustan jaihind krishna radhe radhekrishna ram shriram jaishreeram hanuman ganesh
ganpati shiva mahadev sairam saibaba omsairam durga lakshmi saraswati jaimatadi waheguru allah
bismillah mashallah sachin dhoni virat kohli rohit mumbai delhi kolkata chennai bangalore bengaluru
hyderabad pune faridabad gurgaon gurugram noida lucknow jaipur samsung nokia iphone android google
facebook whatsapp instagram youtube gmail beauty salon spa brand mother father mummy papa family
priyanka anjali pooja neha rahul amit sunita kavita deepak vikas ankit manish suresh ramesh mahesh
rajesh sanjay
`;

export const WEAK_BASE_WORDS: ReadonlySet<string> = new Set(BASE.split(/\s+/).filter(Boolean));
