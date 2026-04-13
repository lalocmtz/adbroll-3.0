# Before we begin

A quick word of advice \- getting FREE users is HARD\!\!\! Not to mention paid ones. Therefore I suggest adding Stripe only in cases where you are quite confident that you will be able to sell your product/service.

# Stripe Integration Steps

### Checklist of things you will need

- [x] ~~**This document**~~  
- [ ] [Stripe account](https://dashboard.stripe.com/register)   
- [ ] Attached documents  
- [ ] Your [Lovable](https://lovable.dev/) \+ [GitHub](https://github.com/) tabs open   
- [ ] [Supabase](https://supabase.com/)   
- [ ] [My Debugging GPT](https://chatgpt.com/g/g-67e1ee8112488191a0a5b87f9cbc43bc-lovable-debugging-prompt-wizard)   
- [ ] [My Stripe Integration GPT](https://chatgpt.com/g/g-67e20dc96c5c81918a852fa624d4783b-lovable-stripe-integration-gpt)

### Step 0: Build the pricing page

To those that are adding Stripe integration, the very first step in this process is to create a pricing page for your project. 

For that, you can use the following prompt in Lovable: 

`Build me a pricing page which would have the following payment options and please reference my project docs, especially masterplan.md to list all the paid plans benefits:` 

- `Option 1 - Free Trial - 14 days`

`Price: FREE` 

- `Option 2 - Basic Plan - Month to Month payment`

`Price: $8.99 per month`

- `Option 3 - Lifetime Deal - One time payment`

`Price: $109` 

`Please use these screenshots as inspiration for designing this page (attach some examples) but follow our current color schema`

After you’ve completed this part, to make this integration easier for you, I have created two files that are universal and could be used for any of your applications. 

**Download Attachments** 

[`stripe.md`](https://docs.google.com/document/d/1F3w-pJHsrC_751vkGPoQYMDmgoQ4MAfyS3MDNVJwgCk/edit?tab=t.0#heading=h.5jyuccncwmmm)  
[`stripe-steps.md`](https://docs.google.com/document/d/1sXzFj6Xc_pVw7aMAzD8qYMzVbGbKsaCZGFpm0uU80TY/edit?tab=t.0#heading=h.koxk39xp1re6) 

### 

### Step 1: Upload the docs

Upload these two documents into your project. 

### Step 2: Reference the docs 

Go to Lovable and switch to chat mode, and then use the following prompt

`I added two docs into the GitHub Repo:`   
`1. stripe.md`  
`2. stripe-steps.md`

`I would like you to read these two documents and then propose a step-by-step plan to integrate Stripe into my application.` 

`Please reference the pricing page for different payment options and products available.` 

### Step 3: Reviewing the plan

Follow the instructions from Lovable, step by step to provide the requested variables: 

### Example: 

3.1. Stripe Dashboard Setup

1. Create a Stripe account if you don't already have one  
2. Create two products in the Stripe Dashboard:  
   * One-time credit package: "Extra Credits Pack" ($9.99 for 50 additional image generations)  
   * Subscription: "Premium Plan" ($19.99/month for unlimited daily generations)  
3. Copy the Price IDs for both products for use in your code  
     
   3.2. Database Schema Updates  
1. Add new fields to the existing profiles table to track credits and subscription status:  
   `ALTER TABLE profiles ADD COLUMN credits INTEGER DEFAULT 0;`  
   `ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';`  
   `ALTER TABLE profiles ADD COLUMN subscription_end TIMESTAMPTZ;`  
2. ALTER TABLE profiles ADD COLUMN stripe\_customer\_id TEXT;  
3. Create a new transactions table to track payment history:  
   `CREATE TABLE transactions (`  
     `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
     `profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,`  
     `stripe_session_id TEXT,`  
     `amount INTEGER,`  
     `credits_purchased INTEGER,`  
     `transaction_type TEXT,`  
     `status TEXT,`  
     `created_at TIMESTAMPTZ DEFAULT now()`  
   `);`  
     
   \-- Add RLS policies for the transactions table  
   `ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;`  
   `CREATE POLICY "Users can view their own transactions"`   
     
4.   ON transactions FOR SELECT USING (auth.uid() \= profile\_id);  
     
     
   3.3. Configure Environment Variables   
   Add the required Stripe keys as Supabase secrets:  
   * STRIPE\_SECRET\_KEY (from your Stripe dashboard)  
   * STRIPE\_PRICE\_ID\_CREDITS (the price ID for your credits package)  
   * STRIPE\_PRICE\_ID\_SUBSCRIPTION (the price ID for your subscription)

   

   3.4: Create Edge Functions

1. Create a create-checkout Edge Function:  
   * Handle both one-time payments (credits) and subscriptions  
   * Use mode: "payment" for credits, mode: "subscription" for subscriptions  
   * Include client reference ID and metadata for tracking  
2. Create a verify-payment Edge Function:  
   * Check completed payments and update user profiles  
   * Add credits for one-time purchases  
   * Update subscription status for subscription purchases  
3. Create a customer-portal Edge Function (optional):  
   * Allow users to manage their subscriptions directly

   

   3.5: Frontend UI Updates

1. Add a "Credits" section to the user profile page showing:  
   * Current credit balance  
   * Subscription status  
   * Purchase history  
2. Create a pricing page with:  
   * Free plan description  
   * Credits package purchase options  
   * Premium subscription options  
   * Payment buttons for each option  
3. Update the transformation process:  
   * Show credit/subscription status in the UI  
   * Display upgrade prompts when users hit limits  
   * Add purchase options in rate limit messages  
4. Add success/cancel pages for Stripe checkout returns

**Basically in this step \- follow the plan laid out in Lovable and make sure to prepare and provide all the requested project variables**

### Step 4: Ask Lovable to record Stripe Customer ID

Sometimes it will suggest this, other times it will not. So for you running a subscription based project, I advise to use the following prompt while still in planning in Lovable: 

 `You should add the stripe_customer_id to the profiles table for the following reasons:`

1. `Customer Identification: The stripe_customer_id allows you to associate a Supabase user with their Stripe customer record. This is essential for tracking purchases, managing credits, and handling future transactions for the same user.`  
2. `Simplified Checkout: With the stripe_customer_id stored, you can provide a smoother checkout experience for returning customers as their payment information can be pre-filled.`  
3. `Payment History: It makes it easier to retrieve a user's purchase history directly from Stripe using their customer ID.`  
4. `Following Best Practices: The stripe-steps.md document you provided explicitly includes stripe_customer_id in the profiles table schema as a recommended practice.`  
5. `Future-Proofing: Even though you're currently focusing on one-time payments, having the stripe_customer_id in your schema will make it easier to implement subscriptions later if you decide to offer them.`

It may be added in during planning process so this step is optional.

### Step 5: Task based implementation system

By now, Lovable may lose track, and so can you too. This is where I introduce the “final blow” by building a task based step by step system that is easy to follow, using this prompt: 

`Break down the Stripe integration into tasks, list all actions, including all database updates, all changes to the environment, UI, creating edge functions, and all the steps I need to do myself in Stripe as well. Please reference the stripe-steps.md for this task.` 

`Also, at this point, before you proceed to create Stripe integration, use stripe.md and ask me any clarifying questions that you may need to create a task list.` 

`Format this list of tasks in the following manner:` 

`## Task 1 - NAME OF TASK`  
`Subtasks:`   
`### 1.1. Name of subtask`

- `Bullet point 1`  
- `Bullet point 2`   
- `Bullet point 3`  
- `etc`

`### 1.2. Name of subtask`

- `Bullet point 1`  
- `Bullet point 2`   
- `Bullet point 3`  
- `etc`

`### 1.3. Name of subtask`

- `Bullet point 1`  
- `Bullet point 2`   
- `Bullet point 3`  
- `etc`

`## Task 2 - NAME OF TASK`  
`Subtasks:`   
`### 2.1. Name of subtask`

- `Bullet point 1`  
- `Bullet point 2`   
- `Bullet point 3`  
- `etc`

`### 2.2. Name of subtask`

- `Bullet point 1`  
- `Bullet point 2`   
- `Bullet point 3`  
- `etc`

`### 2.3. Name of subtask`

- `Bullet point 1`  
- `Bullet point 2`   
- `Bullet point 3`  
- `etc`

`etc.` 

`DO NOT ADD BULLET POINTS UNLESS ABSOLUTELY NECESSARY` 

`Do you understand?`

### Step 6: Create [stripe-tasks.md](http://stripe-tasks.md) file and upload it for future reference

Like with all previous documentation related lessons, in this step simply repeat best practices of project planning and create \+ upload the documents That are going to help you continue to develop this application. 

This document is to be created based on the output that you receive from Lovable in step 5\. 

### Step 7: Visit Lovable Stripe Integration GPT and ask it to help you with step by step 

This GPT has the ability to show you the process to know how to do everything from the very basic steps to the more complicated ones. And to really power it up, you can: 

* Visit your GitHub repo settings and set the project visibility to public  
* Go to [https://repomix.com/](https://repomix.com/) and pack the entire codebase into one XML file  
* Upload that file into my GPT and have it help you integrate Stripe specifically on your terms for your own project

Reference documentation:   
[https://supabase.com/docs/guides/functions/examples/stripe-webhooks](https://supabase.com/docs/guides/functions/examples/stripe-webhooks)   
[https://www.loom.com/share/c70b0b62c83f427d8105e4d2d29690a5](https://www.loom.com/share/c70b0b62c83f427d8105e4d2d29690a5)   
[https://docs.stripe.com/api/checkout/sessions](https://docs.stripe.com/api/checkout/sessions)   
