+++
title = "Running a Custom Email Address"
transparent = true
date = 2024-12-12
description = "Some tips and tricks I've found using Zoho mail, calendar, and campaigns"
[taxonomies]
tags = [
    "email",
    "technology",
    "personal",
    "productivity"
  ]
[extra.comments]
+++

This is primarily written for my friend Jewel, but I might as well document it for everyone else.

I own the domain `peacock.dev`, and it's a fun one to have! It allows me to have the `<firstname@lastname.tld>` format, which is concise and unique. It's also been convenient as I've changed my name a couple times over the past few years. My original `gmail` account can't ever be adjusted, and it's going to be a struggle to leave it behind. I'll go over the basics of how this all works, and share some tips I've learned that make my life better along the way.

Also, apart from the TLD registration, all of these are free services with optional upgrades for additional features, at the time of writing!

## Registering a domain

I'm pretty ambivalent about domain registries. I used to like Google Domains, but now my domains are split between [Netlify](https://app.netlify.com) and [Squarespace](https://domains.squarespace.com/). It doesn't really matter where you pick them up, so if anything is more convenient for a website, it'll be fine as long as it lets you configure DNS records. You can even buy one through Zoho.

## Setting up your email

The Zoho docs are pretty well defined! Start by creating an account using an existing email (it's good to have a fallback gmail or protonmail for this). Then go ahead and follow the documentation.

[https://www.zoho.com/mail/how-to/setup-my-domain-with-zoho-mail.html](https://www.zoho.com/mail/how-to/setup-my-domain-with-zoho-mail.html)

It may be scary to deal with CNAME and TXT records, but I promise that the guides are pretty clear and it's simpler than you'd expect. You only have to do it once.

Congrats! You can test sending and receiving email now and everything else after this is optional.

### Catchall address

This is a pretty easy thing to set up, and it's so so worth it.

In Zoho, you go into the Admin console, then Domains -> Advanced Settings -> Catch-All Address

You can set your primary account as the catch-all address, and then any typos or one-off aliases will be simply delivered to your mailbox. It's super worth doing.

<figure >
  <img src="catchall.png" alt="Zoho Dashboard showing the configuration of the catchall address" style="max-height: 450px"/>
  <figcaption>Configuring the catch-all address</figcaption>
</figure>

### Aliases

Aliases are another step you can use for this if you have specific other addresses you want to be able to send an receive mail as in your inbox. For me, I've had two name changes since I started using the `peacock.dev` email domain. I handled this by:

1. Exporting my old mailboxes
2. Creating my current address as `kaia`
3. Importing the old mailboxes, then moving them to the `archive` folder so they're searchable in my new account
4. Deleting the old addresses
5. Setting them as aliases for my current address

It's a bit of a process, but I can now send and receive mail from all three addresses, and I collect it all into a unified inbox. This is helpful if you go by multiple names, or if you want to have some kind of `admin` or other kind of abstraction you like.

### Filters

Fun fact - on most email providers you can add a `+` after your handle and tack on whatever you want. I use `+promos` for most shopping websites and `+newsletter` for signing up for news and blogs, and then I have filters that put those automatically into folders for me. I have stuff in promos get marked as read automatically to keep my feed a little clearer, too.

## Make a Google Account

This one is really exciting to me! I'd been using Zoho for years, and while it gets the job done, there were some inconveniences in leaving the Google ecosystem behind. Calendar invites worked, but they weren't easy to unify with my work calendar or shared invites from my spouse or friends. If I had someone send me a Google Meet or Drive link, I'd have to sheepishly ask them to re-invite my gmail account. I also couldn't use it for payments, owning my phone, etc.

This is all solved through this new trick I figured out recently - you can create a Google account without a Gmail account!

Start by going to [https://accounts.google.com/signup](https://accounts.google.com/signup), From there, fill out your name and a date of birth, and click the "Use your existing email" button.

<figure >
  <img src="use-existing.png" alt="The penultimate step of the Google signup process, where you can click Use Your Existing Email" style="max-height: 450px"/>
  <figcaption>The penultimate step of the Google signup process</figcaption>
</figure>

This will send a confirmation email to your account, and you'll be able to sign up successfully!

This gives you access to a full Google account with everything except Gmail! You don't have to pay for Google Suite for your custom domain.

One final note - if you try to visit Gmail with this account they will show you this form, trying to convince you to "add a gmail address". **DO NOT DO THIS**. It ruins everything and your custom email become a secondary backup address that can't be used for calendar invites or anything useful.

<figure >
  <img src="gmail-lies.png" alt="deceitful lies from gmail. Reads:  Add Gmail to your Google Account. By completing this form, you're upgrading to Gmail, email from Google. Gmail works on any device, blocks spam, and much more. You'll be able to sign in using your new Gmail address, which will become the primary email address associated with this account. We'll send account updates, invitations, and other notifications to your Gmail address. kaia@peacock.dev will become an alternate email address on this account, and you'll still be able to sign in with it. If you prefer, you can create a new Google Account with email, and leave this one as-is." style="max-height: 450px"/>
  <figcaption>Do not believe their lies</figcaption>
</figure>

## Campaigns

Zoho campaigns offers the sorts of email automation and newsletter support you might imagine for running a business. A lot of the more advanced automation and functionality is locked behind a paywall, but you can use it to coordinate up to 2,000 contacts and send 6,000 messages per month, which is plenty for a small website and newsletter like mine.

To migrate from Substack, I simply exported my mailing list to `csv` and imported it into campaigns. You will have to set up two more text records for your domain, but once that's done you can send email blasts from your own address, with a nice wysiwyg editor.

See this guide on configuring `spf` and `dkim` TXT records: [https://help.zoho.com](https://help.zoho.com/portal/en/kb/campaigns/deliverability-guide/domain-authentication/domain-authentication-techniques/articles/how-to-setup-spf-and-dkim-txt-records-for-your-domain#Add_your_sender_domain)
