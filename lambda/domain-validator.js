exports.handler = async (event) => {
    console.log('Pre Sign-up Lambda triggered:', JSON.stringify(event, null, 2));
    
    const email = event.request.userAttributes.email;
    const allowedDomain = '@dreamteameng.org';
    
    if (!email || !email.endsWith(allowedDomain)) {
        throw new Error(`Registration is restricted to ${allowedDomain} email addresses only.`);
    }
    
    // Auto-verify email for dreamteameng.org domain
    event.response.autoVerifyEmail = true;
    event.response.autoConfirmUser = true;
    
    console.log('Domain validation passed for email:', email);
    return event;
};