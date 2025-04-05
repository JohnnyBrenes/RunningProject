using Supabase;

namespace RunningWebApi.Services;

public class SupabaseClientService
{
    private readonly Supabase.Client _client;

    public SupabaseClientService(IConfiguration config)
    {
        var url = Environment.GetEnvironmentVariable("SUPABASE_URL");
        var key = Environment.GetEnvironmentVariable("SUPABASE_KEY");

        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
        {
            throw new InvalidOperationException("Supabase URL and Key must be provided.");
        }

        _client = new Supabase.Client(url, key);
    }

    public Supabase.Client GetClient()
    {
        return _client;
    }
}
