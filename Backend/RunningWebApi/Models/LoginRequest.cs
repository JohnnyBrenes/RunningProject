using System.ComponentModel.DataAnnotations;

namespace RunningWebApi.Models;

public class LoginRequest
{
    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}
