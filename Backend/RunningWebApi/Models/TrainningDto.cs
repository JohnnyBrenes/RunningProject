using System.ComponentModel.DataAnnotations;

namespace RunningWebApi.Models;

public class TrainningDto : IValidatableObject
{
    public DateTime Date { get; set; }

    [Range(0.01, 500)]
    public double Kilometers { get; set; }

    [Required]
    [RegularExpression(@"^\d{1,4}:\d{2}$", ErrorMessage = "Time must use the MM:SS format.")]
    public string Time { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Pace { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Shoes { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Location { get; set; } = "Treadmill";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Date.Year < 2000 || Date > DateTime.UtcNow.AddDays(1))
        {
            yield return new ValidationResult(
                "Date must be between 2000 and today.",
                [nameof(Date)]
            );
        }
    }
}
