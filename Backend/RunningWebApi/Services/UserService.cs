using RunningWebApi.Models;
using Supabase;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using static Supabase.Postgrest.Constants;

namespace RunningWebApi.Services;

public class UserService
{
    private readonly Supabase.Client _client;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IConfiguration config,
        SupabaseClientService service,
        ILogger<UserService> logger
    )
    {
        _client = service.GetClient();
        _logger = logger;
    }

    public async Task<List<Users>> GetAllAsync()
    {
        _logger.LogInformation("Fetching all users from Supabase...");
        var result = await _client.From<Users>().Get();
        return result.Models;
    }

    public async Task<Users?> GetByIdAsync(Guid id)
    {
        _logger.LogInformation("Fetching user with Id: {Id} from Supabase...", id);
        var result = await _client
            .From<Users>()
            .Filter("id", Operator.Equals, id.ToString())
            .Single();
        return result;
    }

    public async Task<Users?> GetByUsernameAsync(string username)
    {
        _logger.LogInformation(
            "Fetching user with Username: {Username} from Supabase...",
            username
        );
        var result = await _client
            .From<Users>()
            .Filter("username", Operator.Equals, username)
            .Single();
        return result;
    }

    public async Task<Users> CreateAsync(Users user)
    {
        _logger.LogInformation("Creating a new user in Supabase...");
        user.Id = Guid.NewGuid();
        var result = await _client.From<Users>().Insert(user);
        return result.Models.First();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        _logger.LogInformation("Deleting user with Id: {Id} from Supabase...", id);

        var idString = id.ToString();

        var response = await _client.From<Users>().Filter("id", Operator.Equals, idString).Get();

        var user = response.Models.FirstOrDefault();
        if (user == null)
        {
            _logger.LogWarning("User with Id: {Id} not found in Supabase.", id);
            return false;
        }
        await _client.From<Users>().Filter("id", Operator.Equals, idString).Delete();

        return true;
    }
}
