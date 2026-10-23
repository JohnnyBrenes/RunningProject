using System.ComponentModel.DataAnnotations;

namespace RunningWebApi.Models;

public class RegisterRequest
{
    [Required]
    [RegularExpression(
        @"^[A-Za-z0-9_.-]{3,50}$",
        ErrorMessage = "The username must be 3-50 characters: letters, numbers, '_', '.' or '-'."
    )]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}
