using RunningWebApi.Models;
using Supabase;
using Supabase.Postgrest;
using Supabase.Postgrest.Exceptions;
using static Supabase.Postgrest.Constants;

namespace RunningWebApi.Services;

public class TrainningService
{
    private readonly Supabase.Client _client;
    private readonly ILogger<TrainningService> _logger;

    public TrainningService(
        IConfiguration config,
        SupabaseClientService service,
        ILogger<TrainningService> logger
    )
    {
        _client = service.GetClient();
        _logger = logger;
    }

    public async Task<List<TrainningResponseDto>> GetAsync()
    {
        _logger.LogInformation("Fetching trainnings from Supabase...");
        var result = await _client.From<Trainnings>().Get();
        _logger.LogInformation("Fetched {Count} trainnings from Supabase.", result.Models.Count);

        if (result.Models.Count == 0)
        {
            _logger.LogWarning("No trainnings found in Supabase.");
        }
        else
        {
            foreach (var trainning in result.Models)
            {
                _logger.LogInformation(
                    "Trainning: {Id}, {Date}, {Kilometers}, {Time}, {Pace}, {Shoes}, {UserId}",
                    trainning.Id,
                    trainning.Date,
                    trainning.Kilometers,
                    trainning.Time,
                    trainning.Pace,
                    trainning.Shoes,
                    trainning.UserId
                );
            }
        }

        return result
            .Models.Select(t => new TrainningResponseDto
            {
                Id = t.Id,
                Date = t.Date,
                Kilometers = t.Kilometers,
                Time = t.Time,
                Pace = t.Pace,
                Shoes = t.Shoes,
                Location = t.Location,
                UserId = t.UserId,
            })
            .ToList();
    }

    public async Task<TrainningResponseDto?> GetByIdAsync(Guid id)
    {
        _logger.LogInformation("Fetching trainning with Id: {Id} from Supabase...", id);
        var result = await _client
            .From<Trainnings>()
            .Filter("id", Operator.Equals, id.ToString())
            .Single();
        if (result == null)
        {
            _logger.LogWarning("Trainning with Id: {Id} not found in Supabase.", id);
            return null;
        }

        _logger.LogInformation("Fetched trainning with Id: {Id} from Supabase.", id);
        return new TrainningResponseDto
        {
            Id = result.Id,
            Date = result.Date,
            Kilometers = result.Kilometers,
            Time = result.Time,
            Pace = result.Pace,
            Shoes = result.Shoes,
            Location = result.Location,
            UserId = result.UserId,
        };
    }

    public async Task<List<TrainningResponseDto>> GetByUserIdAsync(string userId)
    {
        _logger.LogInformation("Fetching trainnings for UserId: {UserId} from Supabase...", userId);
        var result = await _client
            .From<Trainnings>()
            .Filter("userid", Operator.Equals, userId.ToString())
            .Get();

        if (result.Models.Count == 0)
        {
            _logger.LogWarning("No trainnings found for UserId: {UserId} in Supabase.", userId);
            return new List<TrainningResponseDto>();
        }

        _logger.LogInformation(
            "Fetched {Count} trainnings for UserId: {UserId} from Supabase.",
            result.Models.Count,
            userId
        );
        return result
            .Models.Select(t => new TrainningResponseDto
            {
                Id = t.Id,
                Date = t.Date,
                Kilometers = t.Kilometers,
                Time = t.Time,
                Pace = t.Pace,
                Shoes = t.Shoes,
                Location = t.Location,
                UserId = t.UserId,
            })
            .ToList();
    }

    public async Task<List<TrainningResponseDto>> GetByUserIdAndYearAsync(string userId, int? year)
    {
        _logger.LogInformation(
            "Fetching trainnings for UserId: {UserId}, Year: {Year} from Supabase...",
            userId,
            year
        );
        var result = await _client
            .From<Trainnings>()
            .Filter("userid", Operator.Equals, userId.ToString())
            .Get();

        if (result.Models.Count == 0)
        {
            _logger.LogWarning("No trainnings found for UserId: {UserId} in Supabase.", userId);
            return new List<TrainningResponseDto>();
        }

        // Filter by year if provided
        var filtered = result.Models;
        if (year.HasValue)
        {
            filtered = filtered.Where(t => t.Date.Year == year.Value).ToList();
        }

        _logger.LogInformation(
            "Fetched {Count} trainnings for UserId: {UserId}, Year: {Year} from Supabase.",
            filtered.Count,
            userId,
            year
        );
        return filtered
            .Select(t => new TrainningResponseDto
            {
                Id = t.Id,
                Date = t.Date,
                Kilometers = t.Kilometers,
                Time = t.Time,
                Pace = t.Pace,
                Shoes = t.Shoes,
                Location = t.Location,
                UserId = t.UserId,
            })
            .ToList();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        _logger.LogInformation("Deleting training with Id: {Id} from Supabase...", id);

        var idString = id.ToString();

        var response = await _client
            .From<Trainnings>()
            .Filter("id", Operator.Equals, idString)
            .Get();

        var trainning = response.Models.FirstOrDefault();

        if (trainning == null)
        {
            _logger.LogWarning("Training with Id: {Id} not found in Supabase.", id);
            return false;
        }

        await _client.From<Trainnings>().Filter("id", Operator.Equals, idString).Delete();

        _logger.LogInformation("Deleted training with Id: {Id} from Supabase.", id);
        return true;
    }

    public async Task<TrainningResponseDto> CreateAsync(TrainningDto trainning)
    {
        _logger.LogInformation("Creating a new trainning in Supabase...");
        try
        {
            Trainnings data = new()
            {
                Id = Guid.NewGuid(),
                Date = trainning.Date,
                Kilometers = trainning.Kilometers,
                Time = trainning.Time,
                Pace = trainning.Pace,
                Shoes = trainning.Shoes,
                Location = trainning.Location,
                UserId = trainning.UserId,
            };

            var result = await _client.From<Trainnings>().Insert(data);

            if (result.Models == null || result.Models.Count == 0)
            {
                throw new InvalidOperationException(
                    "Supabase did not return any inserted records."
                );
            }

            _logger.LogInformation(
                "Created trainning with Id: {Id}",
                result.Models[0].Id.ToString()
            );

            var createdTrainning = result.Models[0];
            return new TrainningResponseDto
            {
                Id = createdTrainning.Id,
                Date = createdTrainning.Date,
                Kilometers = createdTrainning.Kilometers,
                Time = createdTrainning.Time,
                Pace = createdTrainning.Pace,
                Shoes = createdTrainning.Shoes,
                Location = createdTrainning.Location,
                UserId = createdTrainning.UserId,
            };
        }
        catch (PostgrestException ex)
        {
            _logger.LogError(
                ex,
                "Error creating trainning: {Message}. Request data: {Data}",
                ex.Message,
                Newtonsoft.Json.JsonConvert.SerializeObject(trainning)
            );
            throw;
        }
    }

    public async Task<List<int>> GetYearsByUserIdAsync(string userId)
    {
        _logger.LogInformation("Fetching years for UserId: {UserId} from Supabase...", userId);
        var result = await _client
            .From<Trainnings>()
            .Filter("userid", Operator.Equals, userId.ToString())
            .Get();

        if (result.Models.Count == 0)
        {
            _logger.LogWarning("No trainnings found for UserId: {UserId} in Supabase.", userId);
            return new List<int>();
        }

        var years = result
            .Models.Select(t => t.Date.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToList();

        _logger.LogInformation(
            "Fetched {Count} distinct years for UserId: {UserId} from Supabase.",
            years.Count,
            userId
        );
        return years;
    }
}
