/**
 * @type {import('pocketpages').PageDataLoaderFunc}
 */
module.exports = function (context) {
    const method = context.request.method;
    const { formData, redirect, response } = context;
    let errorMessage = null;

    if (method === 'POST') {
        let data = formData; // Initialize data with formData
        // formData is an object with the submitted values or a function?
        if (typeof formData === 'function') {
            try { data = formData(); } catch (e) { /* formData() failed */ }
        } else if (!formData || Object.keys(formData).length === 0) {
            // Try fallback
            try {
                if (context.request.formData) data = context.request.formData();
                else if (context.request.body) data = context.request.body();
            } catch (e) { /* request.formData/body failed */ }
        }

        const password = data ? data.password : null;

        try {
            // Using a filter to find if any record matches this password
            // Field name is 'password' based on updated types
            // Using findRecordsByFilter since dao() seems unavailable
            const records = $app.findRecordsByFilter('pw', 'password = {:p}', '-created', 1, 0, { p: password });
            const result = records.length > 0 ? records[0] : null;

            if (result) {
                // Set valid cookie (1 year expiry)
                response.cookie('dank_auth', 'true', {
                    path: '/',
                    secure: true,
                    httpOnly: true,
                    maxAge: 31536000
                });

                // Redirect to home
                return redirect('/', { status: 303 });
            }
        } catch (e) {
            // Record not found or error
            console.log('Login attempt failed:', e);
        }

        errorMessage = "Invalid password";
    }

    return {
        errorMessage
    };
};
