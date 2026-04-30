// Orthodox Zone - Developed by dgm at Holy Loch Media (dgm@tuta.com)
// orthodox.zone-web/internal/site/site.go

package site

import (
	"bytes"
	"errors"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"gopkg.in/yaml.v3"
)

type Config struct {
	RootDir   string
	OutputDir string
	Clean     bool
	Check     bool
}

type Page struct {
	Title        string   `yaml:"title"`
	Description  string   `yaml:"description"`
	Slug         string   `yaml:"slug"`
	Nav          string   `yaml:"nav"`
	TemplateName string   `yaml:"template"`
	ExtraCSS     []string `yaml:"extra_css"`
	ExtraScripts []string `yaml:"extra_scripts"`
	Aliases      []string `yaml:"aliases"`
	Draft        bool     `yaml:"draft"`
	Canonical    string   `yaml:"canonical"`

	ContentHTML template.HTML
	SourcePath  string
}

type NavItem struct {
	Label string
	Href  string
	Key   string
}

type templateData struct {
	Page    Page
	Nav     []NavItem
	Content template.HTML
}

type buildState struct {
	cfg       Config
	markdown  goldmark.Markdown
	outputs   map[string]string
	pages     []Page
	templates *template.Template
}

var assetLinkPattern = regexp.MustCompile(`(?i)\b(?:src|href)=["']([^"']+)["']`)

func Build(cfg Config) error {
	state := buildState{
		cfg: cfg,
		markdown: goldmark.New(
			goldmark.WithExtensions(extension.Table, extension.Typographer),
			goldmark.WithParserOptions(parser.WithAutoHeadingID()),
			goldmark.WithRendererOptions(html.WithUnsafe()),
		),
		outputs: map[string]string{},
	}

	if state.cfg.RootDir == "" {
		state.cfg.RootDir = "."
	}
	if state.cfg.OutputDir == "" {
		state.cfg.OutputDir = "public"
	}

	if err := state.loadTemplates(); err != nil {
		return err
	}
	if err := state.loadPages(); err != nil {
		return err
	}
	if err := state.prepareOutput(); err != nil {
		return err
	}
	if err := state.renderPages(); err != nil {
		return err
	}
	if err := state.copyAssets(); err != nil {
		return err
	}
	if err := state.validateAssetLinks(); err != nil {
		return err
	}

	fmt.Printf("built %d pages and aliases into %s\n", len(state.outputs), state.outputPath(""))
	return nil
}

func (state *buildState) copyAssets() error {
	if state.cfg.Check {
		return nil
	}

	if err := copyDir(state.rootPath("assets"), state.outputPath("assets")); err != nil {
		return err
	}

	for _, pair := range [][2]string{
		{"content/media", "media"},
		{"content/files", "files"},
	} {
		source := state.rootPath(pair[0])
		if _, err := os.Stat(source); errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err := copyDir(source, state.outputPath(pair[1])); err != nil {
			return err
		}
	}

	return nil
}

func (state *buildState) loadPages() error {
	contentDir := state.rootPath("content")

	return filepath.WalkDir(contentDir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || filepath.Ext(path) != ".md" {
			return nil
		}

		page, err := state.readPage(path)
		if err != nil {
			return err
		}
		if page.Draft {
			return nil
		}

		state.pages = append(state.pages, page)
		return nil
	})
}

func (state *buildState) loadTemplates() error {
	patterns := []string{
		state.rootPath("templates/base.html"),
		state.rootPath("templates/partials/*.html"),
	}

	tpl, err := template.ParseFiles(expandPatterns(patterns)...)
	if err != nil {
		return err
	}

	state.templates = tpl
	return nil
}

func (state *buildState) outputPath(path string) string {
	return filepath.Join(state.cfg.RootDir, state.cfg.OutputDir, filepath.FromSlash(path))
}

func (state *buildState) prepareOutput() error {
	if state.cfg.Check {
		return nil
	}
	if state.cfg.Clean {
		if err := os.RemoveAll(state.outputPath("")); err != nil {
			return err
		}
	}
	return os.MkdirAll(state.outputPath(""), 0755)
}

func (state *buildState) readPage(path string) (Page, error) {
	var page Page

	data, err := os.ReadFile(path)
	if err != nil {
		return page, err
	}

	meta, body, err := splitFrontMatter(data)
	if err != nil {
		return page, fmt.Errorf("%s: %w", path, err)
	}
	if err := yaml.Unmarshal(meta, &page); err != nil {
		return page, fmt.Errorf("%s: %w", path, err)
	}
	if err := page.validate(path); err != nil {
		return page, err
	}

	var htmlBody bytes.Buffer
	if err := state.markdown.Convert(body, &htmlBody); err != nil {
		return page, fmt.Errorf("%s: %w", path, err)
	}

	page.ContentHTML = template.HTML(htmlBody.String())
	page.SourcePath = path
	return page, nil
}

func (state *buildState) renderPage(page Page, output string) error {
	data := templateData{
		Page:    page,
		Nav:     navItems(),
		Content: page.ContentHTML,
	}

	var rendered bytes.Buffer
	if err := state.templates.ExecuteTemplate(&rendered, "base.html", data); err != nil {
		return fmt.Errorf("%s: %w", page.SourcePath, err)
	}

	if state.cfg.Check {
		return nil
	}

	target := state.outputPath(output)
	if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return err
	}

	return os.WriteFile(target, rendered.Bytes(), 0644)
}

func (state *buildState) renderPages() error {
	sort.Slice(state.pages, func(i int, j int) bool {
		return state.pages[i].Slug < state.pages[j].Slug
	})

	for _, page := range state.pages {
		paths := append([]string{page.Slug}, page.Aliases...)
		for _, slug := range paths {
			output, err := outputFileForSlug(slug)
			if err != nil {
				return fmt.Errorf("%s: %w", page.SourcePath, err)
			}
			if previous, exists := state.outputs[output]; exists {
				if previous == page.SourcePath {
					continue
				}
				return fmt.Errorf("output path collision: %s from %s and %s", output, previous, page.SourcePath)
			}
			state.outputs[output] = page.SourcePath

			if err := state.renderPage(page, output); err != nil {
				return err
			}
		}
	}

	return nil
}

func (state *buildState) rootPath(path string) string {
	return filepath.Join(state.cfg.RootDir, filepath.FromSlash(path))
}

func (state *buildState) validateAssetLinks() error {
	if state.cfg.Check {
		return nil
	}

	for output := range state.outputs {
		data, err := os.ReadFile(state.outputPath(output))
		if err != nil {
			return err
		}

		matches := assetLinkPattern.FindAllSubmatch(data, -1)
		for _, match := range matches {
			link := string(match[1])
			if !shouldCheckAsset(link) {
				continue
			}

			path, err := publicPathFromURL(link)
			if err != nil {
				return err
			}
			if _, err := os.Stat(state.outputPath(path)); err != nil {
				return fmt.Errorf("%s links missing asset %s", output, link)
			}
		}
	}

	return nil
}

func (page Page) validate(path string) error {
	if strings.TrimSpace(page.Title) == "" {
		return fmt.Errorf("%s: missing title", path)
	}
	if strings.TrimSpace(page.Description) == "" {
		return fmt.Errorf("%s: missing description", path)
	}
	if strings.TrimSpace(page.Slug) == "" {
		return fmt.Errorf("%s: missing slug", path)
	}
	if strings.TrimSpace(page.Nav) == "" {
		return fmt.Errorf("%s: missing nav", path)
	}
	if page.TemplateName == "" {
		page.TemplateName = "page"
	}
	if page.TemplateName != "page" {
		return fmt.Errorf("%s: unsupported template %q", path, page.TemplateName)
	}
	return nil
}

func copyDir(source string, target string) error {
	return filepath.WalkDir(source, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		if relative == "." {
			return os.MkdirAll(target, 0755)
		}

		destination := filepath.Join(target, relative)
		if entry.IsDir() {
			return os.MkdirAll(destination, 0755)
		}

		info, err := entry.Info()
		if err != nil {
			return err
		}

		return copyFile(path, destination, info.Mode())
	})
}

func copyFile(source string, target string, mode fs.FileMode) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()

	if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return err
	}

	output, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer output.Close()

	_, err = io.Copy(output, input)
	return err
}

func expandPatterns(patterns []string) []string {
	var files []string
	for _, pattern := range patterns {
		matches, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}
		files = append(files, matches...)
	}
	return files
}

func navItems() []NavItem {
	return []NavItem{
		{Label: "Home", Href: "/", Key: "home"},
		{Label: "About", Href: "/about/", Key: "about"},
		{Label: "Projects", Href: "/projects/", Key: "projects"},
		{Label: "Orthodox Connect", Href: "/projects/connect/", Key: "connect"},
		{Label: "Calendar", Href: "/projects/calendar/", Key: "calendar"},
		{Label: "Resources", Href: "/resources/", Key: "resources"},
		{Label: "Saints", Href: "/saints/", Key: "saints"},
		{Label: "Contact", Href: "/contact/", Key: "contact"},
	}
}

func outputFileForSlug(slug string) (string, error) {
	cleaned, err := cleanSlug(slug)
	if err != nil {
		return "", err
	}
	if strings.HasSuffix(cleaned, ".html") {
		return strings.TrimPrefix(cleaned, "/"), nil
	}
	if cleaned == "/" {
		return "index.html", nil
	}
	return strings.TrimPrefix(strings.TrimSuffix(cleaned, "/")+"/index.html", "/"), nil
}

func cleanSlug(slug string) (string, error) {
	if !strings.HasPrefix(slug, "/") {
		return "", fmt.Errorf("unsafe output slug %q", slug)
	}
	if strings.Contains(slug, "\x00") {
		return "", fmt.Errorf("unsafe output slug %q", slug)
	}

	cleaned := "/" + strings.TrimPrefix(filepath.ToSlash(filepath.Clean(slug)), "/")
	if cleaned == "/." {
		cleaned = "/"
	}
	if strings.Contains(cleaned, "..") {
		return "", fmt.Errorf("unsafe output slug %q", slug)
	}
	return cleaned, nil
}

func publicPathFromURL(link string) (string, error) {
	parsed, err := url.Parse(link)
	if err != nil {
		return "", err
	}
	path := strings.TrimPrefix(parsed.Path, "/")
	if strings.Contains(path, "..") {
		return "", fmt.Errorf("unsafe asset path %q", link)
	}
	return path, nil
}

func shouldCheckAsset(link string) bool {
	if strings.HasPrefix(link, "#") ||
		strings.HasPrefix(link, "mailto:") ||
		strings.HasPrefix(link, "tel:") ||
		strings.HasPrefix(link, "http://") ||
		strings.HasPrefix(link, "https://") ||
		strings.HasPrefix(link, "/orthocal-api/") {
		return false
	}

	parsed, err := url.Parse(link)
	if err != nil || parsed.Path == "" {
		return false
	}

	ext := strings.ToLower(filepath.Ext(parsed.Path))
	switch ext {
	case ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf", ".mp3", ".mp4", ".webm", ".ogg", ".wav":
		return true
	default:
		return false
	}
}

func splitFrontMatter(data []byte) ([]byte, []byte, error) {
	if !bytes.HasPrefix(data, []byte("---\n")) {
		return nil, nil, errors.New("missing YAML front matter")
	}

	parts := bytes.SplitN(data[len("---\n"):], []byte("\n---\n"), 2)
	if len(parts) != 2 {
		return nil, nil, errors.New("unterminated YAML front matter")
	}

	return parts[0], parts[1], nil
}
