namespace RunningWebApi.Models;

public class TrainningDto
{
    public DateTime Date { get; set; }
    public double Kilometers { get; set; }
    public string Time { get; set; } = string.Empty;
    public string Pace { get; set; } = string.Empty;
    public string Shoes { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}
