## Task 1 \- STRIPE DASHBOARD SETUP (Manual)

### 1.1. Create Stripe Account

* Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register)  
* Complete account setup and verification

### 1.2. Create Product & Price

* Go to Products → Add Product  
* Name: "Adbroll Pro"  
* Description: "Full access to TikTok Shop analytics"  
* Price: $29.00 USD, recurring monthly  
* Copy the Price ID (format: price\_xxxxx)

### 1.3. Create Referral Coupon

* Go to Products → Coupons → Create Coupon  
* Type: Percentage discount  
* Amount: 50%  
* Duration: Once (first month only)  
* Name: "Referral Discount 50%"  
* Copy the Coupon ID (format: coupon\_xxxxx or custom code)

### 1.4. Configure Customer Portal

* Go to Settings → Billing → Customer Portal  
* Enable subscription cancellation  
* Enable payment method updates  
* Save configuration

### 1.5. Create Webhook Endpoint

* Go to Developers → Webhooks → Add Endpoint  
* URL: https://gcntnilurlulejwwtpaa.supabase.co/functions/v1/stripe-webhook  
* Events to listen: checkout.session.completed, invoice.paid, invoice.payment\_failed, customer.subscription.deleted, customer.subscription.updated  
* Copy the Webhook Signing Secret (format: whsec\_xxxxx)

---

## Task 2 \- ENVIRONMENT SECRETS

### 2.1. Add Stripe Secrets to Supabase

* STRIPE\_SECRET\_KEY \- From Stripe Dashboard → Developers → API Keys  
* STRIPE\_PRICE\_ID\_PRO \- Price ID from Task 1.2  
* STRIPE\_COUPON\_ID \- Coupon ID from Task 1.3  
* STRIPE\_WEBHOOK\_SECRET \- Webhook signing secret from Task 1.5

---

## Task 3 \- DATABASE UPDATES

### 3.1. Add stripe\_customer\_id to Profiles

* Migration to add stripe\_customer\_id TEXT column to profiles table  
* This links Supabase users to Stripe customers

---

## Task 4 \- EDGE FUNCTIONS

### 4.1. Create create-checkout Function

* Accepts user\_id and referral\_code  
* Creates Stripe Checkout session with subscription mode  
* Applies coupon if valid referral code provided  
* Returns checkout URL

### 4.2. Create stripe-webhook Function

* Verifies Stripe signature  
* Handles checkout.session.completed: creates subscription record  
* Handles invoice.paid: activates access \+ calculates affiliate commission (30%)  
* Handles invoice.payment\_failed: updates subscription status  
* Handles customer.subscription.deleted: deactivates access  
* Updates subscriptions table accordingly

### 4.3. Create customer-portal Function

* Creates Stripe billing portal session  
* Returns portal URL for redirect

---

## Task 5 \- FRONTEND INTEGRATION

### 5.1. Update PaywallModal

* Call create-checkout edge function on "Activar Adbroll Pro" click  
* Redirect user to Stripe Checkout URL  
* Handle loading state

### 5.2. Update Pricing Page

* Connect "Empieza ahora" button to checkout flow  
* Pass referral code from URL/profile to checkout

### 5.3. Create Success Page

* Route: /checkout/success  
* Confirm subscription activated  
* Redirect to dashboard

### 5.4. Create Cancel Page

* Route: /checkout/cancel  
* Handle abandoned checkout  
* Offer to try again

### 5.5. Update Settings Page

* Add subscription management section  
* Show current plan and renewal date  
* Button to access Stripe Customer Portal

---

## Task 6 \- AFFILIATE COMMISSION LOGIC

### 6.1. Webhook Commission Calculation

* On invoice.paid, check if user has referral\_code\_used in profiles  
* Find affiliate by code in affiliate\_codes table  
* Calculate 30% commission ($8.70 from $29)  
* Update affiliate's usd\_earned and usd\_available  
* Create record in affiliate\_payouts table

---

## Task 7 \- BLUR GATE INTEGRATION

### 7.1. Update useBlurGate Hook

* Check subscriptions table for active status  
* hasPaid \= true when subscription status is "active"  
* Fully unlock platform for paid users

---

