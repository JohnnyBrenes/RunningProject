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

    public async Task<List<UsersDto>> GetAllAsync()
    {
        _logger.LogInformation("Fetching all users from Supabase...");
        var result = await _client.From<Users>().Get();

        if (result.Models.Count == 0)
        {
            _logger.LogWarning("No users found in Supabase.");
        }
        else
        {
            foreach (var user in result.Models)
            {
                _logger.LogInformation(
                    "User: {Id}, {Username}, {Email}",
                    user.Id,
                    user.Username,
                    user.Email
                );
            }
        }

        return result
            .Models.Select(u => new UsersDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                PasswordHash = u.PasswordHash,
            })
            .ToList();
    }

    public async Task<UsersDto?> GetByIdAsync(Guid id)
    {
        _logger.LogInformation("Fetching user with Id: {Id} from Supabase...", id);
        var result = await _client
            .From<Users>()
            .Filter("id", Operator.Equals, id.ToString())
            .Single();
        if (result == null)
        {
            _logger.LogWarning("User with Id: {Id} not found in Supabase.", id);
            return null;
        }
        return new UsersDto
        {
            Id = result.Id,
            Username = result.Username,
            Email = result.Email,
            PasswordHash = result.PasswordHash,
        };
    }

    public async Task<UsersDto> CreateAsync(UsersDto user)
    {
        _logger.LogInformation("Creating a new user in Supabase...");
        try{
            Users newUser = new Users
            {
                Id = Guid.NewGuid(),
                Username = user.Username,
                Email = user.Email,
                PasswordHash = user.PasswordHash,
            };
            var result = await _client.From<Users>().Insert(newUser);
            if (result.Models.Count == 0 || result.Models == null)  
            {
                throw new Exception("Failed to create user in Supabase.");
            }
            _logger.LogInformation("User created successfully in Supabase.");
            return new UsersDto
            {
                Id = result.Models[0].Id,
                Username = result.Models[0].Username,
                Email = result.Models[0].Email,
                PasswordHash = result.Models[0].PasswordHash,
            };
        }
        catch (PostgrestException ex)
        {
            _logger.LogError("Error creating user in Supabase: {Message}", ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError("Unexpected error creating user in Supabase: {Message}", ex.Message);
            throw;
        }
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
