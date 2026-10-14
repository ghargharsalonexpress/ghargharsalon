/**
 * Accounts for the k6 load test (plan C17), on a load-test database only:
 *   npm run seed:load -- 300 200
 * Creates N verified professionals spread over a 5 km circle around Faridabad Sector 15 and M
 * customers with one address each. They log in with their mobile number and an SMS code
 * (ADR-0020): professionals 90000xxxxx, customers 91000xxxxx. Emails are
 * load.pro.<n>@loadtest.invalid and load.customer.<n>@loadtest.invalid, so they're easy to
 * find and delete afterwards.
 */
import { loadConfig } from "../src/config";
import { connectDb, disconnectDb, ensureIndexes } from "../src/db";
import { Address } from "../src/modules/addresses/addresses";
import { Professional, toPoint } from "../src/modules/professionals/professional.model";
import { User } from "../src/modules/users/user.model";

const config = loadConfig(process.env);
if (config.isProd) throw new Error("seed:load must never run against production");

const pros = Number(process.argv[2] ?? 300);
const customers = Number(process.argv[3] ?? 200);
const CENTRE = { lat: 28.4089, lng: 77.3178 };
/** A point up to `km` from the centre, spread evenly by index. */
const around = (index: number, km: number) => {
  const angle = index * 2.399963; // golden angle
  const distance = km * Math.sqrt((index % 97) / 97);
  return { lat: CENTRE.lat + (distance / 111) * Math.cos(angle), lng: CENTRE.lng + (distance / (111 * Math.cos((CENTRE.lat * Math.PI) / 180))) * Math.sin(angle) };
};

await connectDb(config.MONGODB_URI);
await ensureIndexes();
const admin = await User.findOne({ role: "admin" });

for (let index = 1; index <= pros; index++) {
  const email = `load.pro.${index}@loadtest.invalid`;
  const user = (await User.findOne({ email })) ?? (await User.create({ role: "professional", email, name: `Load Pro ${index}`, phone: `90000${String(index).padStart(5, "0")}`, locale: "hi" }));
  if (!(await Professional.exists({ userId: user._id }))) {
    const at = around(index, 5);
    await Professional.create({
      userId: user._id,
      gender: index % 3 === 0 ? "male" : "female",
      skills: ["salon_women", "makeup", "spa_women", "grooming_men"],
      baseArea: "Faridabad (load test)",
      travelRadiusKm: 5,
      photo: null,
      verificationNote: "Load test",
      verification: { at: new Date(), by: admin?._id ?? user._id, byName: "Load test" },
      presence: { state: "offline", since: null, lastHeartbeatAt: null, location: toPoint(at.lat, at.lng), locationAt: null, accuracyM: null, activeBookingId: null },
    });
  }
}

for (let index = 1; index <= customers; index++) {
  const email = `load.customer.${index}@loadtest.invalid`;
  const user = (await User.findOne({ email })) ?? (await User.create({ role: "customer", email, name: `Load Customer ${index}`, phone: `91000${String(index).padStart(5, "0")}`, locale: "en" }));
  if (!(await Address.exists({ userId: user._id }))) {
    const at = around(index + 1000, 4);
    await Address.create({ userId: user._id, label: "home", house: `${index}`, building: "", street: "Sector 15", landmark: "", city: "Faridabad", pincode: "121007", location: toPoint(at.lat, at.lng), placeId: null, isDefault: true });
  }
}

console.log(`Load-test accounts ready: ${pros} professionals, ${customers} customers.`);
await disconnectDb();
