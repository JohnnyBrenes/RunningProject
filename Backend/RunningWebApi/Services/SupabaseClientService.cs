using Supabase;

namespace RunningWebApi.Services;

public class SupabaseClientService
{
    private readonly Supabase.Client _client;

    public SupabaseClientService(IConfiguration config)
    {
        var url = Environment.GetEnvironmentVariable("SUPABASE_URL");
        // Use the service_role key so the backend bypasses Row Level Security (RLS).
        // Never expose this key client-side; it is safe only in server environments.
        var key = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");

        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
        {
            throw new InvalidOperationException("Supabase URL and Service Key must be provided.");
        }

        var options = new SupabaseOptions
        {
            AutoRefreshToken = false,
            AutoConnectRealtime = false,
        };

        _client = new Supabase.Client(url, key, options);
    }

    public Supabase.Client GetClient()
    {
        return _client;
    }
}
